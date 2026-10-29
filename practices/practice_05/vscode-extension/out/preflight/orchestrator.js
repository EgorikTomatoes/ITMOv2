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
                    message: started.message
                };
            }
            const ready = await (0, waitUntilOllamaReady_1.waitUntilOllamaReady)({
                fetcher: deps.fetcher,
                baseUrl: deps.baseUrl,
                ...deps.waitOptions,
                signal
            });
            if (ready.state !== "running") {
                await started.startedProcess?.stop();
            }
            return ready;
        });
        if (status.state !== "running") {
            deps.ui.showError(status.errorCode);
        }
    }
}
function runCheck(deps) {
    return deps.ui.runCheck((signal) => (0, checkOllamaStatus_1.checkOllamaStatus)(deps.fetcher, {
        baseUrl: deps.baseUrl,
        signal
    }));
}
