export type RepairRiskLevel = "low" | "medium" | "high";

export interface RepairAction {
  id: string;
  label: string;
  description: string;
  riskLevel: RepairRiskLevel;
  requiresBackup: boolean;
  requiresManualApproval: boolean;
  targetSources: string[];
}

export interface RepairExecutionRecord {
  actionId: string;
  startedAt: string;
  finishedAt?: string;
  status: "pending" | "completed" | "failed" | "skipped";
  message: string;
}
