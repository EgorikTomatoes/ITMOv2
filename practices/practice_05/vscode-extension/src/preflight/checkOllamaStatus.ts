import type { FetchLike, OllamaStatus } from "./types";

export interface CheckOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  baseUrl: string;
}

export async function checkOllamaStatus(fetcher: FetchLike, options: CheckOptions): Promise<OllamaStatus> {
  const { baseUrl, timeoutMs = 1500, signal } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/version`;
    const resp = await fetcher(url, { method: "GET", signal: mergeSignals(signal, controller.signal) });
    if (!resp.ok) {
      return { state: "error", errorCode: "http-error", message: `HTTP ${resp.status}` };
    }
    // Validate Ollama-specific shape to avoid false positives on unrelated services.
    let body: unknown;
    try {
      body = await resp.json();
    } catch {
      return { state: "error", errorCode: "http-error", message: "Invalid API response" };
    }
    if (typeof body !== "object" || body === null || !("version" in body) || typeof (body as { version?: unknown }).version !== "string") {
      return { state: "error", errorCode: "http-error", message: "Invalid API response" };
    }
    return { state: "running", canStartLocal: inferCanStartLocal(baseUrl) };
  } catch (e: unknown) {
    // Distinguish cancellation vs timeout vs network error vs stopped
    if (isProvidedSignalAborted(signal)) {
      return { state: "error", errorCode: "user-cancelled", message: "Cancelled" };
    }
    if (isAbortTimeout(controller.signal)) {
      return { state: "error", errorCode: "health-timeout", message: "Health check timeout" };
    }
    const msg = errorMessage(e);
    if (isConnectionRefused(msg)) {
      return { state: "stopped", canStartLocal: inferCanStartLocal(baseUrl) };
    }
    return { state: "error", errorCode: "network-error", message: msg, canStartLocal: inferCanStartLocal(baseUrl) };
  } finally {
    clearTimeout(timeout);
  }
}

function mergeSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (!a) return b;
  if (!b) return a;
  const controller = new AbortController();
  const onAbort = (from: AbortSignal) => {
    if (!controller.signal.aborted) controller.abort(from.reason);
  };
  a.addEventListener("abort", () => onAbort(a));
  b.addEventListener("abort", () => onAbort(b));
  return controller.signal;
}

function isProvidedSignalAborted(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

function isAbortTimeout(timeoutSignal: AbortSignal): boolean {
  if (!timeoutSignal.aborted) return false;
  // Either our controller aborted or error message contains timeout
  return true;
}

function errorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) {
    const details = [e.message];
    if ("code" in e && typeof e.code === "string") {
      details.push(e.code);
    }
    if (e.cause !== undefined) {
      details.push(errorMessage(e.cause));
    }
    return details.join(" ");
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function isConnectionRefused(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("econnrefused") ||
    m.includes("connection refused") ||
    m.includes("enotfound") ||
    m.includes("could not connect") ||
    m.includes("connect")
  );
}

function inferCanStartLocal(baseUrl: string): boolean {
  try {
    const u = new URL(baseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
  } catch {
    return false;
  }
}
