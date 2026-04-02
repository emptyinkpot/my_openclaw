import { getDiagnosisPayload } from "./routes/diagnosis.ts";
import { getKeysPayload } from "./routes/keys.ts";
import { getProvidersPayload } from "./routes/providers.ts";
import { getRepairPayload } from "./routes/repair.ts";
import { getSnapshotPayload } from "./routes/snapshots.ts";
import { getUsagePayload } from "./routes/usage.ts";

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
