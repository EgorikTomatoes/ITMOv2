import type { FetchLike, OllamaStatus } from "./types";

export interface WaitOptions {
  fetcher: FetchLike;
  baseUrl: string;
  startDeadlineMs?: number;
  pollIntervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
}

export async function waitUntilOllamaReady(opts: WaitOptions): Promise<OllamaStatus> {
  const { fetcher, baseUrl, startDeadlineMs = 15000, pollIntervalMs = 500, maxAttempts = 30, signal } = opts;
  const deadline = Date.now() + startDeadlineMs;
  let attempts = 0;
  while (Date.now() < deadline && attempts < maxAttempts) {
    if (signal?.aborted) {
      return { state: "error", errorCode: "user-cancelled", message: "cancelled" };
    }
    attempts++;
    try {
      const resp = await fetcher(`${baseUrl.replace(/\/$/, "")}/api/version`, { method: "GET", signal });
      if (resp.ok && await isOllamaVersionResponse(resp)) {
        return { state: "running" };
      }
    } catch {
      if (signal?.aborted) return { state: "error", errorCode: "user-cancelled", message: "cancelled" };
    }
    if (attempts < maxAttempts && Date.now() < deadline) {
      await sleep(pollIntervalMs, signal);
    }
  }
  return { state: "error", errorCode: "start-timeout", message: "timeout" };
}

async function isOllamaVersionResponse(response: Response): Promise<boolean> {
  try {
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null &&
      "version" in body && typeof body.version === "string";
  } catch {
    return false;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}
