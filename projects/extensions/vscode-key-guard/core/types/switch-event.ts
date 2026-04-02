export interface SwitchEvent {
  auditId: string;
  provider: "codex" | "roo";
  status: "success" | "failed";
  fromKeyId?: string;
  fromFingerprint?: string;
  toKeyId?: string;
  toFingerprint?: string;
  wroteFiles: string[];
  backupFiles: string[];
  reloadRequired: boolean;
  switchedAt: string;
  note?: string;
}
