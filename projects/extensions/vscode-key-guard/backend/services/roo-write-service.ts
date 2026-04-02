import type { StoredKeyEntry } from "../../core/types/stored-key.ts";
import { VscodeRooSecretBridgeService } from "./vscode-roo-secret-bridge-service.ts";

export class RooWriteService {
  private readonly rooSecretBridgeService: VscodeRooSecretBridgeService;

  constructor(rooSecretBridgeService = new VscodeRooSecretBridgeService()) {
    this.rooSecretBridgeService = rooSecretBridgeService;
  }

  async switchTo(entry: StoredKeyEntry, secret: string): Promise<{
    wroteFiles: string[];
    backupFiles: string[];
    reloadRequired: boolean;
  }> {
    return this.rooSecretBridgeService.switchActiveKey(entry, secret);
  }
}
