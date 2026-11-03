"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOllamaStatus = checkOllamaStatus;
async function checkOllamaStatus(fetcher, options) {
    const { baseUrl, timeoutMs = 1500, signal, canStartLocal = false } = options;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
    try {
        const url = `${baseUrl.replace(/\/$/, "")}/api/version`;
        const resp = await fetcher(url, { method: "GET", signal: mergeSignals(signal, controller.signal) });
        if (!resp.ok) {
            return { state: "error", errorCode: "http-error", message: `HTTP ${resp.status}`, canStartLocal };
        }
        // Validate Ollama-specific shape to avoid false positives on unrelated services.
        let body;
        try {
            body = await resp.json();
        }
        catch {
            return { state: "error", errorCode: "http-error", message: "Invalid API response", canStartLocal };
        }
        if (typeof body !== "object" || body === null || !("version" in body) || typeof body.version !== "string") {
            return { state: "error", errorCode: "http-error", message: "Invalid API response", canStartLocal };
        }
        return { state: "running", canStartLocal };
    }
    catch (e) {
        // Distinguish cancellation vs timeout vs network error vs stopped
        if (isProvidedSignalAborted(signal)) {
            return { state: "error", errorCode: "user-cancelled", message: "Cancelled", canStartLocal: false };
        }
        if (isAbortTimeout(controller.signal)) {
            return { state: "error", errorCode: "health-timeout", message: "Health check timeout", canStartLocal };
        }
        const msg = errorMessage(e);
        if (isConnectionRefused(msg)) {
            return { state: "stopped", canStartLocal };
        }
        return { state: "error", errorCode: "network-error", message: msg, canStartLocal };
    }
    finally {
        clearTimeout(timeout);
    }
}
function mergeSignals(a, b) {
    if (!a)
        return b;
    if (!b)
        return a;
    const controller = new AbortController();
    const onAbort = (from) => {
        if (!controller.signal.aborted)
            controller.abort(from.reason);
    };
    a.addEventListener("abort", () => onAbort(a));
    b.addEventListener("abort", () => onAbort(b));
    return controller.signal;
}
function isProvidedSignalAborted(signal) {
    return Boolean(signal?.aborted);
}
function isAbortTimeout(timeoutSignal) {
    if (!timeoutSignal.aborted)
        return false;
    // Either our controller aborted or error message contains timeout
    return true;
}
function errorMessage(e) {
    if (typeof e === "string")
        return e;
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
    }
    catch {
        return String(e);
    }
}
function isConnectionRefused(msg) {
    const m = msg.toLowerCase();
    return (m.includes("econnrefused") ||
        m.includes("connection refused") ||
        m.includes("enotfound") ||
        m.includes("could not connect") ||
        m.includes("connect"));
}
