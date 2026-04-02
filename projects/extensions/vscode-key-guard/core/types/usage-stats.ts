export type UsagePeriod = "daily" | "weekly" | "monthly";

export interface UsageSeriesPoint {
  date: string;
  usage: number;
  cost?: number;
  requests?: number;
}

export interface UsageModelStat {
  model: string;
  usage: number;
  cost?: number;
  requests?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreateTokens?: number;
  allTokens?: number;
}

export interface UsageStatsSummary {
  provider?: "codex" | "roo";
  keyId?: string;
  label?: string;
  apiId?: string;
  totalUsage?: number;
  totalCost?: number;
  quota?: number;
  remainingQuota?: number;
  dailyCostLimit?: number;
  totalCostLimit?: number;
  currentDailyCost?: number;
  currentTotalCost?: number;
  period: UsagePeriod;
  series: UsageSeriesPoint[];
  models: UsageModelStat[];
  syncedAt: string;
  source: "live" | "cache" | "unavailable";
  error?: string;
}

export interface UsageCacheFile {
  version: 1;
  updatedAt: string;
  entries: Record<string, UsageStatsSummary>;
}
