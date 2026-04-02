import type { DiagnosisEvidence } from "./diagnosis.ts";

export interface ProviderActiveStatus {
  provider: "codex" | "roo";
  activeKeyFingerprint?: string;
  activeKeyId?: string;
  activeLabel?: string;
  apiId?: string;
  baseUrl?: string;
  model?: string;
  configName?: string;
  sourcePath?: string;
  configPath?: string;
  runtimeAligned: boolean;
  registryMatch: "matched" | "untracked" | "missing";
  observedAt: string;
  candidateKeyCount: number;
  runtimeSources: string[];
  evidence: DiagnosisEvidence[];
  lastSwitchAt?: string;
  lastSwitchTargetKeyId?: string;
  lastSwitchAuditId?: string;
}
