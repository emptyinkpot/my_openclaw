import type { ConfigSnapshot } from "../../core/types/config-snapshot.ts";
import type { RepairAction } from "../../core/types/repair-action.ts";
import { getDiagnosisPayload } from "./diagnosis.ts";

function getSnapshotById(snapshots: ConfigSnapshot[], id: string): ConfigSnapshot | undefined {
  return snapshots.find((snapshot) => snapshot.id === id);
}

function buildPlannedActions(): RepairAction[] {
  return [
    {
      id: "stabilize-codex-file-plan",
      label: "Codex stays file-backed",
      description:
        "Keep Codex on direct `auth.json` and `config.toml` reads and writes, because those are the real writable sources.",
      riskLevel: "low",
      requiresBackup: true,
      requiresManualApproval: false,
      targetSources: ["codex-auth-json", "codex-config-toml"],
    },
    {
      id: "use-roo-secret-bridge",
      label: "Use Roo Secret bridge",
      description:
        "Read and write Roo SecretStorage through the Windows Local State + DPAPI + AES-GCM bridge instead of through `.roo/.env.local` edits.",
      riskLevel: "medium",
      requiresBackup: true,
      requiresManualApproval: true,
      targetSources: ["vscode-roo-secret-storage", "vscode-roo-state-db"],
    },
    {
      id: "align-roo-active-profile",
      label: "Align Roo runtime state",
      description:
        "Use `currentApiConfigName` in Roo global state as the active selector, then align the task index and task history for the current workspace when drift is detected.",
      riskLevel: "medium",
      requiresBackup: true,
      requiresManualApproval: true,
      targetSources: ["vscode-roo-state-db", "vscode-roo-task-index"],
    },
  ];
}

function buildPlanContext(snapshots: ConfigSnapshot[]) {
  const codexAuthSnapshot = getSnapshotById(snapshots, "codex-auth-json");
  const codexConfigSnapshot = getSnapshotById(snapshots, "codex-config-toml");
  const taskIndexSnapshot = getSnapshotById(snapshots, "vscode-roo-task-index");
  const stateDbSnapshot = getSnapshotById(snapshots, "vscode-roo-state-db");
  const secretSnapshot = getSnapshotById(snapshots, "vscode-roo-secret-storage");
  const envSnapshot = getSnapshotById(snapshots, "roo-env-local");
  const currentConfigName = stateDbSnapshot?.configName ?? null;
  const taskIndexConfigName = taskIndexSnapshot?.configName ?? null;

  return {
    codex: {
      keySource: codexAuthSnapshot?.source ?? "codex-auth-json",
      keyPath: codexAuthSnapshot?.filePath ?? null,
      configSource: codexConfigSnapshot?.source ?? "codex-config-toml",
      configPath: codexConfigSnapshot?.filePath ?? null,
      baseUrl: codexConfigSnapshot?.baseUrl ?? null,
      model: codexConfigSnapshot?.model ?? null,
    },
    roo: {
      candidateEnvPath: envSnapshot?.filePath ?? "C:/Users/ASUS-KL/.roo/.env.local",
      envCandidatePresent: envSnapshot?.health === "present",
      selectorSource: stateDbSnapshot?.source ?? "vscode-roo-state-db",
      selectorPath: stateDbSnapshot?.filePath ?? null,
      currentApiConfigName: currentConfigName,
      baseUrl: stateDbSnapshot?.baseUrl ?? null,
      model: stateDbSnapshot?.model ?? null,
      taskIndexSource: taskIndexSnapshot?.source ?? "vscode-roo-task-index",
      taskIndexPath: taskIndexSnapshot?.filePath ?? null,
      taskIndexConfigName,
      runtimeDriftDetected:
        Boolean(currentConfigName && taskIndexConfigName && currentConfigName !== taskIndexConfigName),
      secretSource: secretSnapshot?.source ?? "vscode-roo-secret-storage",
      secretPath: secretSnapshot?.filePath ?? null,
      secretBridgeRequired: secretSnapshot?.metadata.bridgeRequired ?? true,
      secretBridgeAvailable: secretSnapshot?.metadata.bridgeRequired === false,
      secretRowsPresent: secretSnapshot?.health === "present",
    },
    facts: {
      rooEnvIsPrimary: false,
      rooSecretRows: "openAiApiKey + roo_cline_config_api_config",
      secretStorageEncrypted: true,
    },
  };
}

function buildPlanSteps(planContext: ReturnType<typeof buildPlanContext>) {
  return [
    "Keep Codex on the direct file path: read and write `auth.json` for the secret and `config.toml` for provider, model, and base URL.",
    "Downgrade `.roo/.env.local` to candidate-only input. It may still be useful for import or history, but it is not the active Roo source of truth on this machine.",
    `Read Roo active profile selection from \`state.vscdb\` -> \`RooVeterinaryInc.roo-cline\` -> \`currentApiConfigName\` (currently ${planContext.roo.currentApiConfigName ?? "unknown"}).`,
    `Compare that selector with \`tasks/_index.json\` for the current workspace (currently ${planContext.roo.taskIndexConfigName ?? "unknown"}), and align runtime state if they differ.`,
    planContext.roo.secretBridgeAvailable
      ? "Use the available Windows Secret bridge to read and write Roo SecretStorage rows instead of `.roo/.env.local`."
      : "Bridge support is currently unavailable, so Roo key mutation must stay blocked until SecretStorage can be read safely.",
    "Back up `state.vscdb`, `tasks/_index.json`, and the original Roo secret blobs before any mutation.",
    "Use the Secret bridge to update `openAiApiKey` and `roo_cline_config_api_config`, then write back the matching Roo state row.",
    "Re-run diagnosis and, if runtime still looks stale, recommend a VS Code or extension-host restart.",
  ];
}

export async function getRepairPayload() {
  const diagnosis = await getDiagnosisPayload();
  const planContext = buildPlanContext(diagnosis.snapshots);
  const hasRooRuntimeDrift = Boolean(planContext.roo.runtimeDriftDetected);
  const requiresSecretBridge = Boolean(planContext.roo.secretBridgeRequired);

  return {
    status: requiresSecretBridge
      ? "manual_review_required"
      : hasRooRuntimeDrift
        ? "manual_review_required"
        : "plan_available",
    message: requiresSecretBridge
      ? "The previous Roo plan was incorrect: active Roo secrets live in encrypted VS Code SecretStorage rows, so complete read/write support requires a Secret bridge instead of `.roo/.env.local` edits."
      : hasRooRuntimeDrift
        ? "The Roo Secret bridge is available, so the remaining work is to align runtime task state with the active Roo profile."
        : "The Codex and Roo source-of-truth plan is corrected, and the Roo Secret bridge is now available for real key read/write operations.",
    actions: buildPlannedActions(),
    diagnosis,
    executionEnabled: false,
    requiresRestart: hasRooRuntimeDrift,
    playbookId: "correct-source-of-truth-plan",
    playbookTitle: "Correct Codex and Roo Source-of-Truth Plan",
    planContext,
    steps: buildPlanSteps(planContext),
  };
}
