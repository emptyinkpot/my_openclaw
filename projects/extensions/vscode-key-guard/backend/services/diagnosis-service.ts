import type { DiagnosisEvidence, DiagnosisResult } from "../../core/types/diagnosis.ts";
import type { ConfigSnapshot } from "../../core/types/config-snapshot.ts";

type SnapshotComparator = "configName" | "baseUrl" | "model";

function pushDriftEvidence(
  evidence: DiagnosisEvidence[],
  runtimeSnapshot: ConfigSnapshot,
  canonicalSnapshot: ConfigSnapshot,
  field: SnapshotComparator,
): void {
  evidence.push({
    snapshotId: runtimeSnapshot.id,
    source: runtimeSnapshot.source,
    detail: `${field} drift: expected ${canonicalSnapshot[field] ?? "-"}, got ${runtimeSnapshot[field] ?? "-"}.`,
  });
}

export class DiagnosisService {
  diagnose(snapshots: ConfigSnapshot[], observedAt: string): DiagnosisResult {
    const evidence: DiagnosisEvidence[] = [];
    const requiredSnapshotIds = new Set([
      "codex-config-toml",
      "codex-auth-json",
      "vscode-roo-state-db",
      "vscode-roo-secret-storage",
      "vscode-roo-task-index",
    ]);
    const missing = snapshots.filter(
      (snapshot) => requiredSnapshotIds.has(snapshot.id) && snapshot.health !== "present",
    );
    const rooStateSnapshot = snapshots.find((snapshot) => snapshot.id === "vscode-roo-state-db");
    const rooSecretSnapshot = snapshots.find((snapshot) => snapshot.id === "vscode-roo-secret-storage");
    const rooTaskIndexSnapshot = snapshots.find((snapshot) => snapshot.id === "vscode-roo-task-index");

    if (missing.length > 0) {
      for (const snapshot of missing) {
        evidence.push({
          snapshotId: snapshot.id,
          source: snapshot.source,
          detail: `Snapshot health is ${snapshot.health}.`,
        });
      }

      return {
        status: "invalid_config",
        summary: "One or more required Codex or Roo active-state sources are missing or invalid.",
        observedAt,
        snapshots,
        evidence,
        suggestedAction: "Inspect unreadable active-state sources before attempting any repair or switch.",
        canAutoFix: false,
      };
    }

    const rooRuntimeSnapshots = [rooTaskIndexSnapshot].filter(
      (snapshot): snapshot is ConfigSnapshot => Boolean(snapshot),
    );

    if (rooStateSnapshot) {
      const driftFields: SnapshotComparator[] = ["configName", "baseUrl", "model"];

      for (const runtimeSnapshot of rooRuntimeSnapshots) {
        for (const field of driftFields) {
          const runtimeValue = runtimeSnapshot[field];
          const canonicalValue = rooStateSnapshot[field];

          if (runtimeValue && canonicalValue && runtimeValue !== canonicalValue) {
            pushDriftEvidence(evidence, runtimeSnapshot, rooStateSnapshot, field);
          }
        }
      }
    }

    if (rooTaskIndexSnapshot && !rooTaskIndexSnapshot.configName) {
      evidence.push({
        snapshotId: rooTaskIndexSnapshot.id,
        source: rooTaskIndexSnapshot.source,
        detail: "Roo task index is present but does not expose an active apiConfigName yet.",
      });
    }

    if (rooStateSnapshot && !rooStateSnapshot.configName) {
      evidence.push({
        snapshotId: rooStateSnapshot.id,
        source: rooStateSnapshot.source,
        detail: "VS Code global state is present but does not expose Roo currentApiConfigName yet.",
      });
    }

    if (rooSecretSnapshot?.metadata.bridgeRequired) {
      evidence.push({
        snapshotId: rooSecretSnapshot.id,
        source: rooSecretSnapshot.source,
        detail:
          "Roo secret bridge required: active Roo secrets live in encrypted VS Code SecretStorage rows, so file-only reads and writes are incomplete.",
      });
    }

    const hasDrift = evidence.length > 0;
    const requiresSecretBridge = evidence.some((item) =>
      item.detail.startsWith("Roo secret bridge required:"),
    );
    const canAutoFix = evidence.some(
      (item) =>
        item.snapshotId === "vscode-roo-task-index" &&
        item.detail.startsWith("configName drift:"),
    ) && !requiresSecretBridge;

    if (hasDrift) {
      return {
        status: requiresSecretBridge
          ? "manual_action_required"
          : canAutoFix
            ? "auto_fixable"
            : "drift_detected",
        summary: requiresSecretBridge
          ? "Roo active profile metadata is visible, but encrypted SecretStorage still blocks complete key read/write support."
          : canAutoFix
            ? "Roo task history disagrees with the active global-state config selection."
            : "Runtime-adjacent Roo evidence disagrees with the active global-state config.",
        observedAt,
        snapshots,
        evidence,
        suggestedAction: requiresSecretBridge
          ? "Treat `.roo/.env.local` as candidate-only, then add a VS Code Secret bridge before enabling Roo key read/write or switch execution."
          : canAutoFix
            ? "Align the active Roo task config name with the global-state currentApiConfigName, then re-sample the runtime evidence."
            : "Review Roo runtime evidence and verify the active profile before changing any key.",
        canAutoFix,
      };
    }

    return {
      status: "healthy",
      summary: "The monitored Codex sources and Roo active-state metadata agree for the currently visible providers.",
      observedAt,
      snapshots,
      evidence,
      suggestedAction: "Continue monitoring.",
      canAutoFix: false,
    };
  }
}
