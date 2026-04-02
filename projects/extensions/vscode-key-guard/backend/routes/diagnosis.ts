import { AuditService } from "../services/audit-service.ts";
import { DiagnosisService } from "../services/diagnosis-service.ts";
import { getSnapshotPayload } from "./snapshots.ts";

export async function getDiagnosisPayload() {
  const payload = await getSnapshotPayload();
  const diagnosisService = new DiagnosisService();
  const auditService = new AuditService();
  const diagnosis = diagnosisService.diagnose(payload.snapshots, payload.observedAt);

  await auditService.writeLatestDiagnosis(diagnosis);

  return diagnosis;
}
