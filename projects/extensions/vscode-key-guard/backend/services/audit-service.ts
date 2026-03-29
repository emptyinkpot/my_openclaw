import { writeFile } from "node:fs/promises";

import type { DiagnosisResult } from "../../core/types/diagnosis";

const latestStatePath = new URL("../../state/latest.json", import.meta.url);

export class AuditService {
  async writeLatestDiagnosis(diagnosis: DiagnosisResult): Promise<void> {
    await writeFile(
      latestStatePath,
      JSON.stringify(
        {
          status: diagnosis.status,
          summary: diagnosis.summary,
          observedAt: diagnosis.observedAt,
          suggestedAction: diagnosis.suggestedAction,
          evidence: diagnosis.evidence,
          snapshots: diagnosis.snapshots,
        },
        null,
        2,
      ),
      "utf8",
    );
  }
}
