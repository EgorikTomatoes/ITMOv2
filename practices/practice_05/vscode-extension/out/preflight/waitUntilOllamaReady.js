"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitUntilOllamaReady = waitUntilOllamaReady;
async function waitUntilOllamaReady(opts) {
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
        }
        catch {
            if (signal?.aborted)
                return { state: "error", errorCode: "user-cancelled", message: "cancelled" };
        }
        if (attempts < maxAttempts && Date.now() < deadline) {
            await sleep(pollIntervalMs, signal);
        }
    }
    return { state: "error", errorCode: "start-timeout", message: "timeout" };
}
async function isOllamaVersionResponse(response) {
    try {
        const body = await response.json();
        return typeof body === "object" && body !== null &&
            "version" in body && typeof body.version === "string";
    }
    catch {
        return false;
    }
}
function sleep(ms, signal) {
    return new Promise((resolve) => {
        const timeout = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            resolve();
        }, { once: true });
    });
}
