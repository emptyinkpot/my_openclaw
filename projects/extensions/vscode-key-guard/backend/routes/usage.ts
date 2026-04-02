import type { UsagePeriod } from "../../core/types/usage-stats.ts";
import { nowIso } from "../../core/utils/time.ts";
import { UsageStatsService } from "../services/usage-stats-service.ts";

function normalizePeriod(value: string | null): UsagePeriod {
  if (value === "weekly" || value === "monthly") {
    return value;
  }

  return "daily";
}

export async function getUsagePayload(searchParams: URLSearchParams) {
  const provider = searchParams.get("provider");
  const keyId = searchParams.get("keyId");
  const period = normalizePeriod(searchParams.get("period"));
  const service = new UsageStatsService();

  return {
    observedAt: nowIso(),
    items: await service.getUsageSummaries({
      provider: provider === "codex" || provider === "roo" ? provider : undefined,
      keyId: keyId ?? undefined,
      period,
    }),
  };
}

export async function refreshUsagePayload(body: unknown) {
  const record = body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : {};
  const provider = record.provider;
  const keyId = record.keyId;
  const period = normalizePeriod(typeof record.period === "string" ? record.period : null);
  const service = new UsageStatsService();

  return {
    observedAt: nowIso(),
    items: await service.getUsageSummaries({
      provider: provider === "codex" || provider === "roo" ? provider : undefined,
      keyId: typeof keyId === "string" ? keyId : undefined,
      period,
      forceRefresh: true,
    }),
  };
}
