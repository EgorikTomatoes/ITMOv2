"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOllama = startOllama;
async function startOllama(opts) {
    if (opts.signal?.aborted) {
        return { ok: false, errorCode: "user-cancelled", message: "Cancelled" };
    }
    if (!opts.platform.isMacOS) {
        return {
            ok: false,
            errorCode: "unsupported-platform",
            message: "Unsupported platform"
        };
    }
    const executable = await opts.runner.findExecutable("ollama");
    if (!executable) {
        return { ok: false, errorCode: "ollama-not-found", message: "ollama not found" };
    }
    try {
        // The executable is resolved locally and arguments are fixed. No shell is involved.
        const startedProcess = await opts.runner.start(executable, ["serve"]);
        return { ok: true, message: "started", startedProcess };
    }
    catch (error) {
        return {
            ok: false,
            errorCode: "start-failed",
            message: error instanceof Error ? error.message : String(error)
        };
    }
}
