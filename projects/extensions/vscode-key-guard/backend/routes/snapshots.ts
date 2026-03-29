import { CodexConfigService } from "../services/codex-config-service";
import { RooConfigService } from "../services/roo-config-service";
import { VscodeStateService } from "../services/vscode-state-service";

export async function getSnapshotPayload() {
  const observedAt = new Date().toISOString();
  const codexService = new CodexConfigService();
  const rooService = new RooConfigService();
  const vscodeService = new VscodeStateService();

  const snapshots = [
    ...(await codexService.collectSnapshots(observedAt)),
    ...(await rooService.collectSnapshots(observedAt)),
    ...(await vscodeService.collectSnapshots(observedAt)),
  ];

  return {
    observedAt,
    snapshots,
  };
}
