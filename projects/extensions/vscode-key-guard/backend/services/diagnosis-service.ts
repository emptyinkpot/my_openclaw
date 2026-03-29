import type { DiagnosisEvidence, DiagnosisResult } from "../../core/types/diagnosis";
import type { ConfigSnapshot } from "../../core/types/config-snapshot";

export class DiagnosisService {
  diagnose(snapshots: ConfigSnapshot[], observedAt: string): DiagnosisResult {
    const evidence: DiagnosisEvidence[] = [];
    const missing = snapshots.filter((snapshot) => snapshot.health !== "present");

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

    const fingerprints = new Set(
      snapshots.map((snapshot) => snapshot.keyFingerprint).filter(Boolean),
    );
    const configNames = new Set(
      snapshots.map((snapshot) => snapshot.configName).filter(Boolean),
    );
    const baseUrls = new Set(
      snapshots.map((snapshot) => snapshot.baseUrl).filter(Boolean),
    );

    if (fingerprints.size > 1 || configNames.size > 1 || baseUrls.size > 1) {
      evidence.push({
        snapshotId: "normalized-comparison",
        source: "diagnosis-service",
        detail: "Normalized snapshots disagree on fingerprint, config name, or base URL.",
      });

      return {
        status: "drift_detected",
        summary: "Configuration drift detected across monitored sources.",
        observedAt,
        snapshots,
        evidence,
        suggestedAction: "Review drift sources and decide whether a controlled repair is safe.",
        canAutoFix: false,
      };
    }

    return {
      status: "healthy",
      summary: "All collected sources agree on the normalized configuration view.",
      observedAt,
      snapshots,
      evidence,
      suggestedAction: "Continue monitoring.",
      canAutoFix: false,
    };
  }
}
