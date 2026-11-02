import type { FetchLike, OllamaStatus } from "./types";
import { checkOllamaStatus } from "./checkOllamaStatus";

export interface WaitOptions {
  fetcher: FetchLike;
  baseUrl: string;
  startDeadlineMs?: number;
  pollIntervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export async function waitUntilOllamaReady(opts: WaitOptions): Promise<OllamaStatus> {
  const {
    fetcher,
    baseUrl,
    startDeadlineMs = 15000,
    pollIntervalMs = 500,
    maxAttempts = 30,
    signal,
    now = Date.now,
    sleep = sleepWithSignal
  } = opts;
  const deadline = now() + startDeadlineMs;
  let attempts = 0;
  while (now() < deadline && attempts < maxAttempts) {
    if (signal?.aborted) {
      return { state: "error", errorCode: "user-cancelled", message: "cancelled" };
    }
    attempts++;
    const remainingMs = Math.max(1, deadline - now());
    const status = await checkOllamaStatus(fetcher, {
      baseUrl,
      timeoutMs: Math.min(1500, remainingMs),
      signal
    });
    if (status.state === "running") {
      return status;
    }
    if (status.errorCode === "user-cancelled") {
      return status;
    }
    if (attempts < maxAttempts && now() < deadline) {
      await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - now())), signal);
    }
  }
  return { state: "error", errorCode: "start-timeout", message: "timeout" };
}

function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}
