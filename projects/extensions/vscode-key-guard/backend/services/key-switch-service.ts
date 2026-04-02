import { randomUUID } from "node:crypto";

import type { SwitchEvent } from "../../core/types/switch-event.ts";
import { nowIso } from "../../core/utils/time.ts";
import { getSnapshotPayload } from "../routes/snapshots.ts";
import { AuditService } from "./audit-service.ts";
import { CodexWriteService } from "./codex-write-service.ts";
import { DiagnosisService } from "./diagnosis-service.ts";
import { KeyRegistryService } from "./key-registry-service.ts";
import { ProviderStatusService } from "./provider-status-service.ts";
import { RooWriteService } from "./roo-write-service.ts";

export class KeySwitchService {
  private readonly keyRegistryService: KeyRegistryService;
  private readonly providerStatusService: ProviderStatusService;
  private readonly auditService: AuditService;
  private readonly codexWriteService: CodexWriteService;
  private readonly rooWriteService: RooWriteService;

  constructor(
    keyRegistryService = new KeyRegistryService(),
    providerStatusService = new ProviderStatusService(),
    auditService = new AuditService(),
    codexWriteService = new CodexWriteService(),
    rooWriteService = new RooWriteService(),
  ) {
    this.keyRegistryService = keyRegistryService;
    this.providerStatusService = providerStatusService;
    this.auditService = auditService;
    this.codexWriteService = codexWriteService;
    this.rooWriteService = rooWriteService;
  }

  async switchKey(provider: "codex" | "roo", targetKeyId: string) {
    const entry = await this.keyRegistryService.getEntry(targetKeyId);
    if (!entry) {
      throw new Error(`Stored key not found: ${targetKeyId}`);
    }

    if (
      !entry.providerHints.includes("shared") &&
      !entry.providerHints.includes(provider)
    ) {
      throw new Error(`Stored key ${targetKeyId} is not marked for provider ${provider}.`);
    }

    const secret = await this.keyRegistryService.resolveSecret(entry.id);
    if (!secret) {
      throw new Error(`Stored key secret is not available: ${entry.id}`);
    }

    const beforePayload = await getSnapshotPayload();
    const diagnosisService = new DiagnosisService();
    const beforeDiagnosis = diagnosisService.diagnose(
      beforePayload.snapshots,
      beforePayload.observedAt,
    );
    const statuses = await this.providerStatusService.buildStatuses(
      beforePayload.snapshots,
      beforeDiagnosis,
    );
    const currentStatus = statuses.find((item) => item.provider === provider);

    const shouldReapplyRooActiveKey = provider === "roo" && currentStatus?.runtimeAligned === false;

    if (currentStatus?.activeKeyId === targetKeyId && !shouldReapplyRooActiveKey) {
      const event: SwitchEvent = {
        auditId: `switch-${randomUUID()}`,
        provider,
        status: "success",
        fromKeyId: targetKeyId,
        fromFingerprint: currentStatus.activeKeyFingerprint,
        toKeyId: targetKeyId,
        toFingerprint: entry.fingerprint,
        wroteFiles: [],
        backupFiles: [],
        reloadRequired: false,
        switchedAt: nowIso(),
        note: "Target key is already active.",
      };

      await this.auditService.writeSwitchEvent(event);
      return {
        success: true,
        ...event,
        providerStatus: currentStatus,
        diagnosis: beforeDiagnosis,
      };
    }

    let writerResult: {
      wroteFiles: string[];
      backupFiles: string[];
      reloadRequired: boolean;
    };

    try {
      writerResult = provider === "codex"
        ? await this.codexWriteService.switchTo(entry, secret)
        : await this.rooWriteService.switchTo(entry, secret);
    } catch (error) {
      const failedEvent: SwitchEvent = {
        auditId: `switch-${randomUUID()}`,
        provider,
        status: "failed",
        fromKeyId: currentStatus?.activeKeyId,
        fromFingerprint: currentStatus?.activeKeyFingerprint,
        toKeyId: entry.id,
        toFingerprint: entry.fingerprint,
        wroteFiles: [],
        backupFiles: [],
        reloadRequired: false,
        switchedAt: nowIso(),
        note: error instanceof Error ? error.message : "Unknown switch failure.",
      };

      await this.auditService.writeSwitchEvent(failedEvent);
      throw error;
    }

    const afterPayload = await getSnapshotPayload();
    const afterDiagnosis = diagnosisService.diagnose(afterPayload.snapshots, afterPayload.observedAt);
    const afterStatuses = await this.providerStatusService.buildStatuses(
      afterPayload.snapshots,
      afterDiagnosis,
    );
    const afterStatus = afterStatuses.find((item) => item.provider === provider);
    const expectedRooConfigName = provider === "roo"
      ? (entry.configName || "codex-openai")
      : undefined;

    if (
      provider === "roo" &&
      (!afterStatus || afterStatus.configName !== expectedRooConfigName)
    ) {
      const failedEvent: SwitchEvent = {
        auditId: `switch-${randomUUID()}`,
        provider,
        status: "failed",
        fromKeyId: currentStatus?.activeKeyId,
        fromFingerprint: currentStatus?.activeKeyFingerprint,
        toKeyId: entry.id,
        toFingerprint: entry.fingerprint,
        wroteFiles: writerResult.wroteFiles,
        backupFiles: writerResult.backupFiles,
        reloadRequired: writerResult.reloadRequired,
        switchedAt: nowIso(),
        note: `roo_state_overwrote_profile: expected ${expectedRooConfigName}, got ${afterStatus?.configName ?? "<missing>"}`,
      };

      await this.auditService.writeSwitchEvent(failedEvent);
      throw new Error(failedEvent.note);
    }

    const event: SwitchEvent = {
      auditId: `switch-${randomUUID()}`,
      provider,
      status: "success",
      fromKeyId: currentStatus?.activeKeyId,
      fromFingerprint: currentStatus?.activeKeyFingerprint,
      toKeyId: entry.id,
      toFingerprint: entry.fingerprint,
      wroteFiles: writerResult.wroteFiles,
      backupFiles: writerResult.backupFiles,
      reloadRequired: writerResult.reloadRequired,
      switchedAt: nowIso(),
    };

    await this.auditService.writeSwitchEvent(event);

    return {
      success: true,
      ...event,
      providerStatus: afterStatus,
      diagnosis: afterDiagnosis,
    };
  }
}
