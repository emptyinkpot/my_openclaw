import type { DiagnosisEvidence, DiagnosisResult } from "../../core/types/diagnosis.ts";
import type { ConfigSnapshot } from "../../core/types/config-snapshot.ts";

type SnapshotComparator = "configName" | "keyFingerprint" | "baseUrl";

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
    const missing = snapshots.filter((snapshot) => snapshot.health !== "present");
    const missingRooEnv = snapshots.find(
      (snapshot) => snapshot.id === "roo-env-local" && snapshot.health !== "present",
    );
    const rooEnvSnapshot = snapshots.find((snapshot) => snapshot.id === "roo-env-local");
    const rooTaskIndexSnapshot = snapshots.find((snapshot) => snapshot.id === "vscode-roo-task-index");
    const rooStateDbSnapshot = snapshots.find((snapshot) => snapshot.id === "vscode-roo-state-db");

    if (missingRooEnv) {
      evidence.push({
        snapshotId: missingRooEnv.id,
        source: missingRooEnv.source,
        detail: "Roo env file is missing, so runtime may fall back to stale VS Code state.",
      });

      return {
        status: "stale_runtime",
        summary: "Roo env configuration is missing while VS Code runtime state still exists.",
        observedAt,
        snapshots,
        evidence,
        suggestedAction: "Restore the Roo env file or disable Roo runtime until a canonical config is available.",
        canAutoFix: false,
      };
    }

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
        summary: "One or more required configuration sources are missing or invalid.",
        observedAt,
        snapshots,
        evidence,
        suggestedAction: "Inspect unreadable sources before attempting any repair.",
        canAutoFix: false,
      };
    }

    const rooRuntimeSnapshots = [rooTaskIndexSnapshot, rooStateDbSnapshot].filter(
      (snapshot): snapshot is ConfigSnapshot => Boolean(snapshot),
    );

    if (rooEnvSnapshot) {
      const driftFields: SnapshotComparator[] = ["configName", "keyFingerprint", "baseUrl"];

      for (const runtimeSnapshot of rooRuntimeSnapshots) {
        for (const field of driftFields) {
          const runtimeValue = runtimeSnapshot[field];
          const canonicalValue = rooEnvSnapshot[field];

          if (runtimeValue && canonicalValue && runtimeValue !== canonicalValue) {
            pushDriftEvidence(evidence, runtimeSnapshot, rooEnvSnapshot, field);
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

    if (rooStateDbSnapshot && !rooStateDbSnapshot.configName) {
      evidence.push({
        snapshotId: rooStateDbSnapshot.id,
        source: rooStateDbSnapshot.source,
        detail: "VS Code global state is present but does not expose Roo currentApiConfigName yet.",
      });
    }

    const hasDrift = evidence.length > 0;
    const canAutoFix = evidence.some(
      (item) =>
        (item.snapshotId === "vscode-roo-task-index" || item.snapshotId === "vscode-roo-state-db") &&
        item.detail.startsWith("configName drift:"),
    );

    if (hasDrift) {
      return {
        status: canAutoFix ? "auto_fixable" : "drift_detected",
        summary: canAutoFix
          ? "Roo runtime state disagrees with the canonical env config on the active config name."
          : "Runtime-adjacent Roo evidence disagrees with the canonical config.",
        observedAt,
        snapshots,
        evidence,
        suggestedAction: canAutoFix
          ? "Validate the Roo env config, then align the active VS Code task config name with the canonical source."
          : "Review Roo runtime evidence and verify whether a controlled repair is safe.",
        canAutoFix,
      };
    }

    return {
      status: "healthy",
      summary: "Canonical config and runtime-adjacent evidence agree for the monitored providers.",
      observedAt,
      snapshots,
      evidence,
      suggestedAction: "Continue monitoring.",
      canAutoFix: false,
    };
  }
}
