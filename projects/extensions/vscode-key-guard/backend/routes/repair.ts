import type { ConfigSnapshot } from "../../core/types/config-snapshot.ts";
import type { RepairAction } from "../../core/types/repair-action.ts";
import { getDiagnosisPayload } from "./diagnosis.ts";

function getSnapshotById(snapshots: ConfigSnapshot[], id: string): ConfigSnapshot | undefined {
  return snapshots.find((snapshot) => snapshot.id === id);
}

function buildPlannedActions(): RepairAction[] {
  return [
    {
      id: "reset-roo-active-config-name",
      label: "Plan Roo active config reset",
      description:
        "Use the canonical Roo env config name to replace the stale active config reference discovered in VS Code state.",
      riskLevel: "medium",
      requiresBackup: true,
      requiresManualApproval: true,
      targetSources: ["roo-env-local", "vscode-roo-state-db", "vscode-roo-task-index"],
    },
  ];
}

function buildPlanContext(snapshots: ConfigSnapshot[]) {
  const canonicalSnapshot = getSnapshotById(snapshots, "roo-env-local");
  const taskIndexSnapshot = getSnapshotById(snapshots, "vscode-roo-task-index");
  const stateDbSnapshot = getSnapshotById(snapshots, "vscode-roo-state-db");

  return {
    canonical: {
      source: canonicalSnapshot?.source ?? "roo-env-local",
      configName: canonicalSnapshot?.configName ?? null,
      baseUrl: canonicalSnapshot?.baseUrl ?? null,
      keyFingerprint: canonicalSnapshot?.keyFingerprint ?? null,
    },
    runtime: {
      taskIndex: {
        source: taskIndexSnapshot?.source ?? "vscode-roo-task-index",
        configName: taskIndexSnapshot?.configName ?? null,
        selectedTaskId: taskIndexSnapshot?.metadata.selectedTaskId ?? null,
        selectedWorkspace: taskIndexSnapshot?.metadata.selectedWorkspace ?? null,
      },
      stateDb: {
        source: stateDbSnapshot?.source ?? "vscode-roo-state-db",
        configName: stateDbSnapshot?.configName ?? null,
        apiProvider: stateDbSnapshot?.metadata.apiProvider ?? null,
        ownerMatched: stateDbSnapshot?.metadata.ownerMatched ?? null,
      },
    },
  };
}

function buildPlanSteps(expectedConfigName: string | null) {
  return [
    "Capture a fresh diagnosis snapshot and persist the current runtime evidence.",
    "Create a backup of the targeted VS Code Roo state before any mutation.",
    `Update the active Roo config reference to ${expectedConfigName ?? "the canonical config name"} in the approved state location only.`,
    "Re-run diagnosis and confirm that the configName drift evidence disappears.",
    "Recommend a VS Code or extension-host restart if runtime state remains stale.",
  ];
}

export async function getRepairPayload() {
  const diagnosis = await getDiagnosisPayload();
  const hasRooConfigNameDrift = diagnosis.evidence.some(
    (item) =>
      (item.snapshotId === "vscode-roo-state-db" || item.snapshotId === "vscode-roo-task-index") &&
      item.detail.startsWith("configName drift:"),
  );

  if (!hasRooConfigNameDrift) {
    return {
      status: "not_needed",
      message: "No repair candidate is planned because no canonical-vs-runtime Roo config name drift is active.",
      actions: [],
      diagnosis,
      planContext: buildPlanContext(diagnosis.snapshots),
      playbookId: null,
      playbookTitle: null,
      steps: [],
    };
  }

  const planContext = buildPlanContext(diagnosis.snapshots);

  return {
    status: diagnosis.canAutoFix ? "plan_available" : "manual_review_required",
    message:
      "Repair execution remains disabled, but a guarded plan is available for the detected Roo active config drift.",
    actions: buildPlannedActions(),
    diagnosis,
    executionEnabled: false,
    requiresRestart: true,
    playbookId: "reset-active-roo-config-name",
    playbookTitle: "Reset Active Roo Config Name",
    planContext,
    steps: buildPlanSteps(planContext.canonical.configName),
  };
}
