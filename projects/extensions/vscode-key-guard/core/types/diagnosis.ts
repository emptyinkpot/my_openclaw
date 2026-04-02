import type { ConfigSnapshot } from "./config-snapshot.ts";

export type DiagnosisStatus =
  | "healthy"
  | "drift_detected"
  | "stale_runtime"
  | "invalid_config"
  | "auto_fixable"
  | "manual_action_required";

export interface DiagnosisEvidence {
  snapshotId: string;
  source: string;
  detail: string;
}

export interface DiagnosisResult {
  status: DiagnosisStatus;
  summary: string;
  observedAt: string;
  snapshots: ConfigSnapshot[];
  evidence: DiagnosisEvidence[];
  suggestedAction: string;
  canAutoFix: boolean;
}
