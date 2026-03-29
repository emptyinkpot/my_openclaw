import { nowIso } from "../../core/utils/time";
import { getDiagnosisPayload } from "../routes/diagnosis";

export async function runPeriodicScan() {
  const diagnosis = await getDiagnosisPayload();

  return {
    job: "periodic-scan",
    ranAt: nowIso(),
    diagnosis,
    persisted: true,
  };
}
