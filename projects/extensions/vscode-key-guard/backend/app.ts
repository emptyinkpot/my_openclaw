import { getDiagnosisPayload } from "./routes/diagnosis";
import { getRepairPayload } from "./routes/repair";
import { getSnapshotPayload } from "./routes/snapshots";

export async function createBackendApp() {
  return {
    async snapshots() {
      return getSnapshotPayload();
    },
    async diagnosis() {
      return getDiagnosisPayload();
    },
    async repair() {
      return getRepairPayload();
    },
  };
}
