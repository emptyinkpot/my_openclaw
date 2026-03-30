import { appendFile, readFile, writeFile } from "node:fs/promises";

import type { DiagnosisResult } from "../../core/types/diagnosis.ts";
import type { SwitchEvent } from "../../core/types/switch-event.ts";
import { resolveRuntimeStateFile } from "./runtime-state-paths.ts";

const publicMirrorPath = new URL("../../../../shared/key-guard.latest.json", import.meta.url);

function toPersistedDiagnosis(diagnosis: DiagnosisResult) {
  return {
    status: diagnosis.status,
    summary: diagnosis.summary,
    observedAt: diagnosis.observedAt,
    suggestedAction: diagnosis.suggestedAction,
    canAutoFix: diagnosis.canAutoFix,
    evidence: diagnosis.evidence,
    snapshots: diagnosis.snapshots,
  };
}

export class AuditService {
  async writeLatestDiagnosis(diagnosis: DiagnosisResult): Promise<void> {
    const persistedDiagnosis = toPersistedDiagnosis(diagnosis);
    const payload = JSON.stringify(persistedDiagnosis, null, 2);
    const latestStatePath = await resolveRuntimeStateFile("latest.json");
    const historyLogPath = await resolveRuntimeStateFile("history", "diagnosis-history.jsonl");

    await writeFile(latestStatePath, payload, "utf8");
    await writeFile(publicMirrorPath, payload, "utf8");
    await appendFile(historyLogPath, `${JSON.stringify(persistedDiagnosis)}\n`, "utf8");
  }

  async writeSwitchEvent(event: SwitchEvent): Promise<void> {
    const latestStatePath = await resolveRuntimeStateFile("latest-switches.json");
    const historyLogPath = await resolveRuntimeStateFile("history", "switch-history.jsonl");
    const current = await this.readLatestSwitches();
    current[event.provider] = event;

    await writeFile(latestStatePath, JSON.stringify(current, null, 2), "utf8");
    await appendFile(historyLogPath, `${JSON.stringify(event)}\n`, "utf8");
  }

  async readLatestSwitchEvent(
    provider?: "codex" | "roo",
  ): Promise<SwitchEvent | null> {
    const current = await this.readLatestSwitches();

    if (provider) {
      return current[provider] ?? null;
    }

    const values = Object.values(current).filter((item): item is SwitchEvent => Boolean(item));
    if (values.length === 0) {
      return null;
    }

    values.sort((left, right) => right.switchedAt.localeCompare(left.switchedAt));
    return values[0];
  }

  private async readLatestSwitches(): Promise<Partial<Record<"codex" | "roo", SwitchEvent>>> {
    const latestStatePath = await resolveRuntimeStateFile("latest-switches.json");

    try {
      const content = await readFile(latestStatePath, "utf8");
      const parsed = JSON.parse(content) as Partial<Record<"codex" | "roo", SwitchEvent>>;
      return parsed ?? {};
    } catch {
      return {};
    }
  }
}
