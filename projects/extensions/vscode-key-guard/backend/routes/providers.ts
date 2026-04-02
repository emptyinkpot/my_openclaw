import { nowIso } from "../../core/utils/time.ts";
import { getSnapshotPayload } from "./snapshots.ts";
import { DiagnosisService } from "../services/diagnosis-service.ts";
import { ProviderStatusService } from "../services/provider-status-service.ts";

export async function getProvidersPayload() {
  const snapshotPayload = await getSnapshotPayload();
  const diagnosis = new DiagnosisService().diagnose(
    snapshotPayload.snapshots,
    snapshotPayload.observedAt,
  );
  const service = new ProviderStatusService();

  return {
    observedAt: nowIso(),
    providers: await service.buildStatuses(snapshotPayload.snapshots, diagnosis),
    diagnosis: {
      status: diagnosis.status,
      summary: diagnosis.summary,
      suggestedAction: diagnosis.suggestedAction,
      canAutoFix: diagnosis.canAutoFix,
    },
  };
}

export async function getProviderPayload(provider: string) {
  if (provider !== "codex" && provider !== "roo") {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const payload = await getProvidersPayload();
  const status = payload.providers.find((item) => item.provider === provider);

  if (!status) {
    throw new Error(`Provider status not found: ${provider}`);
  }

  return {
    observedAt: payload.observedAt,
    provider: status,
    diagnosis: payload.diagnosis,
  };
}
