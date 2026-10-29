"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeProcessRunner = createNodeProcessRunner;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const MACOS_OLLAMA_LOCATIONS = [
    "/usr/local/bin/ollama",
    "/opt/homebrew/bin/ollama",
    "/Applications/Ollama.app/Contents/Resources/ollama"
];
function createNodeProcessRunner(environment = process.env) {
    return {
        async findExecutable(command) {
            const pathCandidates = (environment.PATH ?? "")
                .split(node_path_1.delimiter)
                .filter(Boolean)
                .map((directory) => (0, node_path_1.join)(directory, command));
            const candidates = [...new Set([...pathCandidates, ...MACOS_OLLAMA_LOCATIONS])];
            for (const candidate of candidates) {
                try {
                    await (0, promises_1.access)(candidate, node_fs_1.constants.X_OK);
                    return candidate;
                }
                catch {
                    // Try the next known executable location.
                }
            }
            return undefined;
        },
        async start(executable, args) {
            const child = (0, node_child_process_1.spawn)(executable, [...args], {
                detached: true,
                stdio: "ignore"
            });
            const exited = new Promise((resolve) => {
                child.once("exit", (code, signal) => resolve({ code, signal }));
            });
            await new Promise((resolve, reject) => {
                child.once("spawn", resolve);
                child.once("error", reject);
            });
            child.unref();
            return {
                pid: child.pid,
                exited,
                async stop() {
                    if (child.pid === undefined || child.exitCode !== null || child.killed) {
                        return;
                    }
                    try {
                        process.kill(-child.pid, "SIGTERM");
                    }
                    catch (error) {
                        if (!isNoSuchProcessError(error)) {
                            throw error;
                        }
                    }
                }
            };
        }
    };
}
function isNoSuchProcessError(error) {
    return typeof error === "object" && error !== null &&
        "code" in error && error.code === "ESRCH";
}
