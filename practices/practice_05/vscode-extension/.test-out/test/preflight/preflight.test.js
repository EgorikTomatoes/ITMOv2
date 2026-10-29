"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const orchestrator_1 = require("../../src/preflight/orchestrator");
const checkOllamaStatus_1 = require("../../src/preflight/checkOllamaStatus");
const startOllama_1 = require("../../src/preflight/startOllama");
const waitUntilOllamaReady_1 = require("../../src/preflight/waitUntilOllamaReady");
(0, node_test_1.default)("checkOllamaStatus returns running only for an Ollama version response", async () => {
    const running = await (0, checkOllamaStatus_1.checkOllamaStatus)(async () => new Response(JSON.stringify({ version: "0.35.1" }), { status: 200 }), { baseUrl: "http://localhost:11434" });
    const unrelatedService = await (0, checkOllamaStatus_1.checkOllamaStatus)(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }), { baseUrl: "http://localhost:11434" });
    strict_1.default.equal(running.state, "running");
    strict_1.default.equal(running.canStartLocal, true);
    strict_1.default.equal(unrelatedService.state, "error");
    strict_1.default.equal(unrelatedService.errorCode, "http-error");
});
(0, node_test_1.default)("checkOllamaStatus classifies a refused local connection as stopped", async () => {
    const result = await (0, checkOllamaStatus_1.checkOllamaStatus)(async () => { throw new TypeError("connect ECONNREFUSED 127.0.0.1:11434"); }, { baseUrl: "http://localhost:11434" });
    strict_1.default.equal(result.state, "stopped");
    strict_1.default.equal(result.canStartLocal, true);
});
(0, node_test_1.default)("checkOllamaStatus reads ECONNREFUSED from the cause of Node fetch failed", async () => {
    const connectionError = Object.assign(new Error("connect failed"), { code: "ECONNREFUSED" });
    const result = await (0, checkOllamaStatus_1.checkOllamaStatus)(async () => { throw new TypeError("fetch failed", { cause: connectionError }); }, { baseUrl: "http://localhost:11434" });
    strict_1.default.equal(result.state, "stopped");
    strict_1.default.equal(result.canStartLocal, true);
});
(0, node_test_1.default)("checkOllamaStatus aborts a hanging request at the configured timeout", async () => {
    const result = await (0, checkOllamaStatus_1.checkOllamaStatus)((_input, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }), { baseUrl: "http://localhost:11434", timeoutMs: 5 });
    strict_1.default.equal(result.state, "error");
    strict_1.default.equal(result.errorCode, "health-timeout");
});
(0, node_test_1.default)("startOllama uses the resolved executable and fixed serve argument", async () => {
    const calls = [];
    const runner = {
        findExecutable: async () => "/usr/local/bin/ollama",
        start: async (executable, args) => {
            calls.push({ executable, args });
            return { exited: Promise.resolve({ code: 0, signal: null }), stop: async () => undefined };
        }
    };
    const result = await (0, startOllama_1.startOllama)({ runner, platform: { isMacOS: true } });
    strict_1.default.equal(result.ok, true);
    strict_1.default.deepEqual(calls, [{ executable: "/usr/local/bin/ollama", args: ["serve"] }]);
});
(0, node_test_1.default)("startOllama reports missing executable and spawn errors", async () => {
    const missing = await (0, startOllama_1.startOllama)({
        platform: { isMacOS: true },
        runner: {
            findExecutable: async () => undefined,
            start: async () => { throw new Error("must not run"); }
        }
    });
    const failed = await (0, startOllama_1.startOllama)({
        platform: { isMacOS: true },
        runner: {
            findExecutable: async () => "/usr/local/bin/ollama",
            start: async () => { throw new Error("spawn failed"); }
        }
    });
    strict_1.default.equal(missing.errorCode, "ollama-not-found");
    strict_1.default.equal(failed.errorCode, "start-failed");
});
(0, node_test_1.default)("waitUntilOllamaReady retries until the Ollama API becomes available", async () => {
    let attempts = 0;
    const result = await (0, waitUntilOllamaReady_1.waitUntilOllamaReady)({
        baseUrl: "http://localhost:11434",
        pollIntervalMs: 0,
        maxAttempts: 3,
        fetcher: async () => {
            attempts++;
            if (attempts < 3)
                throw new TypeError("fetch failed");
            return new Response(JSON.stringify({ version: "0.35.1" }), { status: 200 });
        }
    });
    strict_1.default.equal(result.state, "running");
    strict_1.default.equal(attempts, 3);
});
(0, node_test_1.default)("waitUntilOllamaReady returns start-timeout after bounded attempts", async () => {
    const result = await (0, waitUntilOllamaReady_1.waitUntilOllamaReady)({
        baseUrl: "http://localhost:11434",
        pollIntervalMs: 0,
        maxAttempts: 2,
        fetcher: async () => { throw new TypeError("fetch failed"); }
    });
    strict_1.default.equal(result.state, "error");
    strict_1.default.equal(result.errorCode, "start-timeout");
});
(0, node_test_1.default)("orchestrator stops before translation flow when the user cancels", async () => {
    const ui = createUi(["cancel"]);
    const result = await (0, orchestrator_1.ensureOllamaRunning)({
        baseUrl: "http://localhost:11434",
        fetcher: async () => { throw new TypeError("connect ECONNREFUSED"); },
        runner: unusedRunner(),
        isMacOS: true,
        ui
    });
    strict_1.default.equal(result, false);
    strict_1.default.deepEqual(ui.seenStates, ["stopped"]);
});
(0, node_test_1.default)("orchestrator starts Ollama, waits for readiness, then continues", async () => {
    let fetchCalls = 0;
    let processStarts = 0;
    const ui = createUi(["start"]);
    const result = await (0, orchestrator_1.ensureOllamaRunning)({
        baseUrl: "http://localhost:11434",
        fetcher: async () => {
            fetchCalls++;
            if (fetchCalls === 1)
                throw new TypeError("connect ECONNREFUSED");
            return new Response(JSON.stringify({ version: "0.35.1" }), { status: 200 });
        },
        runner: {
            findExecutable: async () => "/usr/local/bin/ollama",
            start: async () => {
                processStarts++;
                return { exited: new Promise(() => undefined), stop: async () => undefined };
            }
        },
        isMacOS: true,
        ui
    });
    strict_1.default.equal(result, true);
    strict_1.default.equal(processStarts, 1);
    strict_1.default.equal(ui.runningNotifications, 1);
});
(0, node_test_1.default)("orchestrator stops only the process it started when readiness times out", async () => {
    let fetchCalls = 0;
    let stops = 0;
    const ui = createUi(["start", "cancel"]);
    const result = await (0, orchestrator_1.ensureOllamaRunning)({
        baseUrl: "http://localhost:11434",
        fetcher: async () => {
            fetchCalls++;
            throw new TypeError("connect ECONNREFUSED");
        },
        runner: {
            findExecutable: async () => "/usr/local/bin/ollama",
            start: async () => ({
                exited: new Promise(() => undefined),
                stop: async () => { stops++; }
            })
        },
        isMacOS: true,
        waitOptions: { maxAttempts: 1, pollIntervalMs: 0 },
        ui
    });
    strict_1.default.equal(result, false);
    strict_1.default.ok(fetchCalls >= 2);
    strict_1.default.equal(stops, 1);
});
function createUi(actions) {
    const seenStates = [];
    const ui = {
        seenStates,
        runningNotifications: 0,
        runCheck: (task) => task(new AbortController().signal),
        runStart: (task) => task(new AbortController().signal),
        async chooseAction(status) {
            seenStates.push(status.state);
            return actions.shift() ?? "cancel";
        },
        showRunning() {
            ui.runningNotifications++;
        },
        showError() {
            // Errors are asserted through state transitions in dedicated tests.
        }
    };
    return ui;
}
function unusedRunner() {
    return {
        findExecutable: async () => { throw new Error("must not resolve executable"); },
        start: async () => { throw new Error("must not start process"); }
    };
}
