import { AuditService } from "../services/audit-service";
import { DiagnosisService } from "../services/diagnosis-service";
import { getSnapshotPayload } from "./snapshots";

export async function getDiagnosisPayload() {
  const payload = await getSnapshotPayload();
  const diagnosisService = new DiagnosisService();
  const auditService = new AuditService();
  const diagnosis = diagnosisService.diagnose(payload.snapshots, payload.observedAt);

  await auditService.writeLatestDiagnosis(diagnosis);

  return diagnosis;
}
