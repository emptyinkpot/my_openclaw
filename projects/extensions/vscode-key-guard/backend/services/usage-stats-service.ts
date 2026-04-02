import { readFile, writeFile } from "node:fs/promises";

import type { ProviderActiveStatus } from "../../core/types/provider-status.ts";
import type { StoredKeyEntry } from "../../core/types/stored-key.ts";
import type {
  UsageCacheFile,
  UsageModelStat,
  UsagePeriod,
  UsageSeriesPoint,
  UsageStatsSummary,
} from "../../core/types/usage-stats.ts";
import { nowIso } from "../../core/utils/time.ts";
import { getSnapshotPayload } from "../routes/snapshots.ts";
import { CodexConfigService } from "./codex-config-service.ts";
import { DiagnosisService } from "./diagnosis-service.ts";
import { KeyRegistryService } from "./key-registry-service.ts";
import { ProviderStatusService } from "./provider-status-service.ts";
import { resolveRuntimeCacheFile } from "./runtime-state-paths.ts";
import { RooConfigService } from "./roo-config-service.ts";
import { SoxioStatsClient } from "./soxio-stats-client.ts";

const CACHE_TTL_MS = 10 * 60 * 1000;

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toSeriesPoint(summary: UsageStatsSummary): UsageSeriesPoint {
  return {
    date: summary.syncedAt,
    usage: summary.totalUsage ?? 0,
    cost: summary.totalCost,
  };
}

function mergeSeries(
  current: UsageSeriesPoint[] | undefined,
  point: UsageSeriesPoint,
): UsageSeriesPoint[] {
  const next = Array.isArray(current) ? [...current] : [];
  const last = next[next.length - 1];

  if (last && last.date.slice(0, 16) === point.date.slice(0, 16)) {
    next[next.length - 1] = point;
  } else {
    next.push(point);
  }

  return next.slice(-30);
}

function unavailableUsage(
  period: UsagePeriod,
  message: string,
  context: Partial<UsageStatsSummary> = {},
): UsageStatsSummary {
  return {
    period,
    series: [],
    models: [],
    syncedAt: nowIso(),
    source: "unavailable",
    error: message,
    ...context,
  };
}

export class UsageStatsService {
  private readonly keyRegistryService: KeyRegistryService;
  private readonly providerStatusService: ProviderStatusService;
  private readonly soxioStatsClient: SoxioStatsClient;
  private readonly codexConfigService: CodexConfigService;
  private readonly rooConfigService: RooConfigService;

  constructor(
    keyRegistryService = new KeyRegistryService(),
    providerStatusService = new ProviderStatusService(),
    soxioStatsClient = new SoxioStatsClient(),
    codexConfigService = new CodexConfigService(),
    rooConfigService = new RooConfigService(),
  ) {
    this.keyRegistryService = keyRegistryService;
    this.providerStatusService = providerStatusService;
    this.soxioStatsClient = soxioStatsClient;
    this.codexConfigService = codexConfigService;
    this.rooConfigService = rooConfigService;
  }

  async getUsageSummaries(options: {
    provider?: "codex" | "roo";
    keyId?: string;
    period?: UsagePeriod;
    forceRefresh?: boolean;
  } = {}): Promise<UsageStatsSummary[]> {
    const period = options.period ?? "daily";

    if (options.keyId) {
      return [await this.getUsageForKeyId(options.keyId, period, options.forceRefresh ?? false)];
    }

    if (options.provider) {
      return [await this.getUsageForProvider(options.provider, period, options.forceRefresh ?? false)];
    }

    const providers: Array<"codex" | "roo"> = ["codex", "roo"];
    return Promise.all(
      providers.map((provider) => this.getUsageForProvider(provider, period, options.forceRefresh ?? false)),
    );
  }

  private async getUsageForProvider(
    provider: "codex" | "roo",
    period: UsagePeriod,
    forceRefresh: boolean,
  ): Promise<UsageStatsSummary> {
    const snapshotPayload = await getSnapshotPayload();
    const diagnosis = new DiagnosisService().diagnose(
      snapshotPayload.snapshots,
      snapshotPayload.observedAt,
    );
    const statuses = await this.providerStatusService.buildStatuses(snapshotPayload.snapshots, diagnosis);
    const status = statuses.find((item) => item.provider === provider);

    if (!status?.activeKeyId) {
      return this.getUsageForActiveProvider(provider, period, forceRefresh, status);
    }

    return this.getUsageForKeyId(status.activeKeyId, period, forceRefresh, status);
  }

  private async getUsageForActiveProvider(
    provider: "codex" | "roo",
    period: UsagePeriod,
    forceRefresh: boolean,
    providerStatus?: ProviderActiveStatus,
  ): Promise<UsageStatsSummary> {
    let activeConfig;
    try {
      activeConfig = await this.readActiveProviderConfig(provider);
    } catch (error) {
      return unavailableUsage(
        period,
        error instanceof Error ? error.message : "Failed to read the active provider config.",
        {
          provider,
          label: providerStatus?.activeLabel ?? `Active ${provider} key`,
          apiId: providerStatus?.apiId,
        },
      );
    }

    if (!activeConfig?.secret || !activeConfig.fingerprint) {
      return unavailableUsage(period, "The active key is not matched to a stored registry entry, and no readable active secret was found.", {
        provider,
        label: providerStatus?.activeLabel ?? `Active ${provider} key`,
        apiId: providerStatus?.apiId,
      });
    }

    const cacheKey = this.buildActiveCacheKey(provider, activeConfig.fingerprint);
    const cached = await this.readCacheEntry(cacheKey);

    if (cached && !forceRefresh) {
      const age = Date.now() - new Date(cached.syncedAt).getTime();
      if (age < CACHE_TTL_MS) {
        return {
          ...cached,
          provider,
          label: providerStatus?.activeLabel ?? cached.label ?? `Active ${provider} key`,
        };
      }
    }

    try {
      const summary = await this.fetchLiveUsage(
        {
          provider,
          label: providerStatus?.activeLabel ?? `Active ${provider} key`,
          apiId: providerStatus?.apiId,
          secret: activeConfig.secret,
          baseUrl: activeConfig.baseUrl,
          model: activeConfig.model,
          configName: activeConfig.configName,
        },
        period,
      );
      const merged = cached
        ? {
          ...summary,
          series: mergeSeries(cached.series, toSeriesPoint(summary)),
        }
        : {
          ...summary,
          series: mergeSeries([], toSeriesPoint(summary)),
        };

      await this.writeCacheEntry(cacheKey, merged);
      return merged;
    } catch (error) {
      if (cached) {
        return {
          ...cached,
          provider,
          label: providerStatus?.activeLabel ?? cached.label ?? `Active ${provider} key`,
          source: "cache",
          error: error instanceof Error ? error.message : "Failed to refresh usage stats.",
        };
      }

      return unavailableUsage(period, error instanceof Error ? error.message : "Failed to refresh usage stats.", {
        provider,
        label: providerStatus?.activeLabel ?? `Active ${provider} key`,
        apiId: providerStatus?.apiId,
      });
    }
  }

  private async getUsageForKeyId(
    keyId: string,
    period: UsagePeriod,
    forceRefresh: boolean,
    providerStatus?: ProviderActiveStatus,
  ): Promise<UsageStatsSummary> {
    const entry = await this.keyRegistryService.getEntry(keyId);
    if (!entry) {
      return unavailableUsage(period, `Stored key not found: ${keyId}`, { keyId });
    }

    const cached = await this.readCacheEntry(keyId);
    if (cached && !forceRefresh) {
      const age = Date.now() - new Date(cached.syncedAt).getTime();
      if (age < CACHE_TTL_MS) {
        return {
          ...cached,
          keyId: entry.id,
          label: entry.label,
          provider: providerStatus?.provider ?? cached.provider,
        };
      }
    }

    try {
      const summary = await this.fetchLiveUsage(
        {
          provider: providerStatus?.provider,
          keyId: entry.id,
          label: entry.label,
          apiId: entry.apiId,
          secret: await this.keyRegistryService.resolveSecret(entry.id),
          baseUrl: entry.baseUrl,
          model: entry.model,
          configName: entry.configName,
        },
        period,
      );
      const merged = cached
        ? {
          ...summary,
          series: mergeSeries(cached.series, toSeriesPoint(summary)),
        }
        : {
          ...summary,
          series: mergeSeries([], toSeriesPoint(summary)),
        };

      await this.writeCacheEntry(entry.id, merged);
      await this.keyRegistryService.touchUsageSync(entry.id, merged.apiId, merged.syncedAt);

      return merged;
    } catch (error) {
      if (cached) {
        return {
          ...cached,
          keyId: entry.id,
          label: entry.label,
          provider: providerStatus?.provider ?? cached.provider,
          source: "cache",
          error: error instanceof Error ? error.message : "Failed to refresh usage stats.",
        };
      }

      return unavailableUsage(period, error instanceof Error ? error.message : "Failed to refresh usage stats.", {
        provider: providerStatus?.provider,
        keyId: entry.id,
        label: entry.label,
        apiId: entry.apiId,
      });
    }
  }

  private async fetchLiveUsage(
    entry: {
      id?: string;
      provider?: "codex" | "roo";
      keyId?: string;
      label?: string;
      apiId?: string;
      secret?: string;
      baseUrl?: string;
      model?: string;
      configName?: string;
    },
    period: UsagePeriod,
  ): Promise<UsageStatsSummary> {
    let apiId = entry.apiId;

    if (!apiId) {
      if (!entry.secret) {
        throw new Error("The active key secret is not available for apiId lookup.");
      }

      apiId = await this.soxioStatsClient.getKeyId(entry.secret);
      if (!apiId) {
        throw new Error("The remote stats adapter did not return an apiId.");
      }
    }

    const [stats, modelRows] = await Promise.all([
      this.soxioStatsClient.getUserStats(apiId),
      this.soxioStatsClient.getUserModelStats(apiId, period),
    ]);

    const usageRoot = stats.usage as Record<string, unknown> | undefined;
    const usage = usageRoot?.total as Record<string, unknown> | undefined;
    const limits = stats.limits as Record<string, unknown> | undefined;
    const models = modelRows.map((row) => this.toModelStat(row));
    const totalCost = asNumber(limits?.currentTotalCost) ?? asNumber(usage?.cost);
    const totalCostLimit = asNumber(limits?.totalCostLimit);

    return {
      provider: entry.provider,
      keyId: entry.keyId ?? entry.id,
      label: entry.label ?? "Active key",
      apiId,
      totalUsage: asNumber(usage?.allTokens) ?? asNumber(usage?.tokens),
      totalCost,
      quota: totalCostLimit ?? asNumber(limits?.dailyCostLimit),
      remainingQuota:
        totalCostLimit !== undefined && totalCost !== undefined
          ? Math.max(totalCostLimit - totalCost, 0)
          : undefined,
      dailyCostLimit: asNumber(limits?.dailyCostLimit),
      totalCostLimit,
      currentDailyCost: asNumber(limits?.currentDailyCost),
      currentTotalCost: totalCost,
      period,
      series: [],
      models,
      syncedAt: nowIso(),
      source: "live",
    };
  }

  private async readActiveProviderConfig(provider: "codex" | "roo") {
    if (provider === "codex") {
      return this.codexConfigService.readActiveConfig();
    }

    return this.rooConfigService.readActiveConfig();
  }

  private buildActiveCacheKey(provider: "codex" | "roo", fingerprint: string): string {
    return `active:${provider}:${fingerprint}`;
  }

  private toModelStat(row: Record<string, unknown>): UsageModelStat {
    const costs = row.costs as Record<string, unknown> | undefined;

    return {
      model: typeof row.model === "string" ? row.model : "unknown",
      usage: asNumber(row.allTokens) ?? 0,
      cost: asNumber(costs?.total),
      requests: asNumber(row.requests),
      inputTokens: asNumber(row.inputTokens),
      outputTokens: asNumber(row.outputTokens),
      cacheReadTokens: asNumber(row.cacheReadTokens),
      cacheCreateTokens: asNumber(row.cacheCreateTokens),
      allTokens: asNumber(row.allTokens),
    };
  }

  private async readCacheEntry(keyId: string): Promise<UsageStatsSummary | undefined> {
    const cachePath = await resolveRuntimeCacheFile("usage-cache.json");

    try {
      const content = await readFile(cachePath, "utf8");
      const parsed = JSON.parse(content) as UsageCacheFile;
      return parsed.entries?.[keyId];
    } catch {
      return undefined;
    }
  }

  private async writeCacheEntry(keyId: string, summary: UsageStatsSummary): Promise<void> {
    const cachePath = await resolveRuntimeCacheFile("usage-cache.json");
    let file: UsageCacheFile = {
      version: 1,
      updatedAt: nowIso(),
      entries: {},
    };

    try {
      const content = await readFile(cachePath, "utf8");
      const parsed = JSON.parse(content) as UsageCacheFile;
      file = {
        version: 1,
        updatedAt: nowIso(),
        entries: parsed.entries ?? {},
      };
    } catch {
      file = {
        version: 1,
        updatedAt: nowIso(),
        entries: {},
      };
    }

    file.entries[keyId] = summary;
    file.updatedAt = nowIso();
    await writeFile(cachePath, JSON.stringify(file, null, 2), "utf8");
  }
}
