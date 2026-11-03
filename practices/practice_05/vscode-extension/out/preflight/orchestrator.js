"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureOllamaRunning = ensureOllamaRunning;
const checkOllamaStatus_1 = require("./checkOllamaStatus");
const startOllama_1 = require("./startOllama");
const waitUntilOllamaReady_1 = require("./waitUntilOllamaReady");
async function ensureOllamaRunning(deps) {
    let status = await runCheck(deps);
    while (true) {
        if (status.state === "running") {
            deps.ui.showRunning();
            return true;
        }
        if (status.errorCode === "user-cancelled") {
            return false;
        }
        const action = await deps.ui.chooseAction(status);
        if (action === "cancel") {
            return false;
        }
        if (action === "retry") {
            status = await runCheck(deps);
            continue;
        }
        status = await deps.ui.runStart(async (signal) => {
            const started = await (0, startOllama_1.startOllama)({
                platform: { isMacOS: deps.isMacOS },
                runner: deps.runner,
                signal
            });
            if (!started.ok) {
                return {
                    state: "error",
                    errorCode: started.errorCode,
                    message: started.message,
                    canStartLocal: started.errorCode !== "unsupported-platform" &&
                        started.errorCode !== "ollama-not-found"
                };
            }
            const waitController = new AbortController();
            const abortWait = () => waitController.abort(signal.reason);
            if (signal.aborted) {
                abortWait();
            }
            else {
                signal.addEventListener("abort", abortWait, { once: true });
            }
            const readyPromise = (0, waitUntilOllamaReady_1.waitUntilOllamaReady)({
                fetcher: deps.fetcher,
                baseUrl: deps.baseUrl,
                ...deps.waitOptions,
                signal: waitController.signal
            });
            const exitPromise = started.startedProcess.exited.then((exit) => ({
                state: "error",
                errorCode: classifyProcessExit(exit.stderr),
                message: exit.stderr || `ollama exited with code ${String(exit.code)}`
            }));
            const ready = await Promise.race([readyPromise, exitPromise]);
            waitController.abort();
            signal.removeEventListener("abort", abortWait);
            if (ready.state !== "running") {
                await started.startedProcess?.stop();
            }
            return ready.state === "running" || ready.errorCode === "user-cancelled"
                ? ready
                : { ...ready, canStartLocal: true };
        });
        if (status.errorCode === "user-cancelled") {
            return false;
        }
        if (status.state !== "running") {
            deps.ui.showError(status.errorCode);
        }
    }
}
function runCheck(deps) {
    return deps.ui.runCheck(async (signal) => {
        const canStartLocal = await resolveCanStartLocal(deps);
        return (0, checkOllamaStatus_1.checkOllamaStatus)(deps.fetcher, {
            baseUrl: deps.baseUrl,
            signal,
            canStartLocal
        });
    });
}
async function resolveCanStartLocal(deps) {
    if (!deps.isMacOS || !isLocalUrl(deps.baseUrl)) {
        return false;
    }
    try {
        return Boolean(await deps.runner.findExecutable("ollama"));
    }
    catch {
        return false;
    }
}
function isLocalUrl(baseUrl) {
    try {
        return ["localhost", "127.0.0.1", "::1"].includes(new URL(baseUrl).hostname);
    }
    catch {
        return false;
    }
}
function classifyProcessExit(stderr) {
    const details = stderr?.toLowerCase() ?? "";
    if (details.includes("eaddrinuse") || details.includes("address already in use") || details.includes("port") && details.includes("in use")) {
        return "port-busy";
    }
    return "start-failed";
}
