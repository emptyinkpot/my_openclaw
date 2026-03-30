import { getDiagnosisPayload } from "./routes/diagnosis";
import { getKeysPayload } from "./routes/keys";
import { getProvidersPayload } from "./routes/providers";
import { getRepairPayload } from "./routes/repair";
import { getSnapshotPayload } from "./routes/snapshots";
import { getUsagePayload } from "./routes/usage";

export async function createBackendApp() {
  return {
    async snapshots() {
      return getSnapshotPayload();
    },
    async diagnosis() {
      return getDiagnosisPayload();
    },
    async keys() {
      return getKeysPayload();
    },
    async providers() {
      return getProvidersPayload();
    },
    async usage() {
      return getUsagePayload(new URLSearchParams());
    },
    async repair() {
      return getRepairPayload();
    },
  };
}
