"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitUntilOllamaReady = waitUntilOllamaReady;
const checkOllamaStatus_1 = require("./checkOllamaStatus");
async function waitUntilOllamaReady(opts) {
    const { fetcher, baseUrl, startDeadlineMs = 15000, pollIntervalMs = 500, maxAttempts = 30, signal, now = Date.now, sleep = sleepWithSignal } = opts;
    const deadline = now() + startDeadlineMs;
    let attempts = 0;
    while (now() < deadline && attempts < maxAttempts) {
        if (signal?.aborted) {
            return { state: "error", errorCode: "user-cancelled", message: "cancelled" };
        }
        attempts++;
        const remainingMs = Math.max(1, deadline - now());
        const status = await (0, checkOllamaStatus_1.checkOllamaStatus)(fetcher, {
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
function sleepWithSignal(ms, signal) {
    return new Promise((resolve) => {
        const timeout = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            resolve();
        }, { once: true });
    });
}
