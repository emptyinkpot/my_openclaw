import { nowIso } from "../../core/utils/time.ts";
import { getDiagnosisPayload } from "../routes/diagnosis.ts";

export async function runPeriodicScan() {
  const diagnosis = await getDiagnosisPayload();

  return {
    job: "periodic-scan",
    ranAt: nowIso(),
    diagnosis,
    persisted: true,
  };
}
