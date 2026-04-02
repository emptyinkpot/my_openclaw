import { nowIso } from "../../core/utils/time.ts";
import { KeySwitchService } from "../services/key-switch-service.ts";

export async function switchKeyPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("A JSON request body is required.");
  }

  const record = body as Record<string, unknown>;
  const provider = record.provider;
  const targetKeyId = record.targetKeyId;

  if (provider !== "codex" && provider !== "roo") {
    throw new Error("provider must be codex or roo.");
  }

  if (typeof targetKeyId !== "string" || targetKeyId.trim().length === 0) {
    throw new Error("targetKeyId is required.");
  }

  const service = new KeySwitchService();
  const result = await service.switchKey(provider, targetKeyId.trim());

  return {
    observedAt: nowIso(),
    ...result,
  };
}
