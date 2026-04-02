import type { UsagePeriod } from "../../core/types/usage-stats.ts";

interface SoxioResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  apiId?: string;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export class SoxioStatsClient {
  private readonly baseUrl = normalizeBaseUrl(
    process.env.VSCODE_KEY_GUARD_SOXIO_BASE_URL ?? "https://apikey.soxio.me",
  );

  async getKeyId(apiKey: string): Promise<string | undefined> {
    const payload = await this.postJson<{ id?: string; apiId?: string } | string>(
      "/apiStats/api/get-key-id",
      { apiKey },
    );

    if (typeof payload.data === "string") {
      return payload.data;
    }

    return payload.data?.apiId ?? payload.data?.id ?? payload.apiId;
  }

  async getUserStats(apiId: string): Promise<Record<string, unknown>> {
    const payload = await this.postJson<Record<string, unknown>>(
      "/apiStats/api/user-stats",
      { apiId },
    );

    return payload.data ?? {};
  }

  async getUserModelStats(
    apiId: string,
    period: UsagePeriod,
  ): Promise<Array<Record<string, unknown>>> {
    const payload = await this.postJson<Array<Record<string, unknown>>>(
      "/apiStats/api/user-model-stats",
      { apiId, period },
    );

    return Array.isArray(payload.data) ? payload.data : [];
  }

  private async postJson<T>(pathname: string, body: Record<string, unknown>): Promise<SoxioResponse<T>> {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    const text = await response.text();
    const payload = text.length > 0 ? (JSON.parse(text) as SoxioResponse<T>) : {};

    if (!response.ok || payload.success === false) {
      throw new Error(payload.message ?? `Soxio request failed with status ${response.status}.`);
    }

    return payload;
  }
}
