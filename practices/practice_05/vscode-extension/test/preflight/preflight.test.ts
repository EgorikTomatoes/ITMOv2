import assert from "node:assert/strict";
import test from "node:test";

import { ensureOllamaRunning, type PreflightAction, type PreflightUi } from "../../src/preflight/orchestrator";
import { checkOllamaStatus } from "../../src/preflight/checkOllamaStatus";
import { startOllama } from "../../src/preflight/startOllama";
import type { ErrorCode, OllamaStatus } from "../../src/preflight/types";
import { waitUntilOllamaReady } from "../../src/preflight/waitUntilOllamaReady";
import type { ProcessRunner } from "../../src/process/ollamaRunner";

test("checkOllamaStatus returns running only for an Ollama version response", async () => {
  const running = await checkOllamaStatus(
    async () => new Response(JSON.stringify({ version: "0.35.1" }), { status: 200 }),
    { baseUrl: "http://localhost:11434", canStartLocal: true }
  );
  const unrelatedService = await checkOllamaStatus(
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    { baseUrl: "http://localhost:11434", canStartLocal: true }
  );

  assert.equal(running.state, "running");
  assert.equal(running.canStartLocal, true);
  assert.equal(unrelatedService.state, "error");
  assert.equal(unrelatedService.errorCode, "http-error");
  assert.equal(unrelatedService.canStartLocal, true);
});

test("checkOllamaStatus classifies a refused local connection as stopped", async () => {
  const result = await checkOllamaStatus(
    async () => { throw new TypeError("connect ECONNREFUSED 127.0.0.1:11434"); },
    { baseUrl: "http://localhost:11434", canStartLocal: true }
  );

  assert.equal(result.state, "stopped");
  assert.equal(result.canStartLocal, true);
});

test("checkOllamaStatus reads ECONNREFUSED from the cause of Node fetch failed", async () => {
  const connectionError = Object.assign(new Error("connect failed"), { code: "ECONNREFUSED" });
  const result = await checkOllamaStatus(
    async () => { throw new TypeError("fetch failed", { cause: connectionError }); },
    { baseUrl: "http://localhost:11434", canStartLocal: true }
  );

  assert.equal(result.state, "stopped");
  assert.equal(result.canStartLocal, true);
});

test("checkOllamaStatus aborts a hanging request at the configured timeout", async () => {
  const result = await checkOllamaStatus(
    (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
    { baseUrl: "http://localhost:11434", timeoutMs: 5 }
  );

  assert.equal(result.state, "error");
  assert.equal(result.errorCode, "health-timeout");
});

test("startOllama uses the resolved executable and fixed serve argument", async () => {
  const calls: Array<{ executable: string; args: readonly string[] }> = [];
  const runner: ProcessRunner = {
    findExecutable: async () => "/usr/local/bin/ollama",
    start: async (executable, args) => {
      calls.push({ executable, args });
      return { exited: Promise.resolve({ code: 0, signal: null }), stop: async () => undefined };
    }
  };

  const result = await startOllama({ runner, platform: { isMacOS: true } });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ executable: "/usr/local/bin/ollama", args: ["serve"] }]);
});

test("startOllama reports missing executable and spawn errors", async () => {
  const missing = await startOllama({
    platform: { isMacOS: true },
    runner: {
      findExecutable: async () => undefined,
      start: async () => { throw new Error("must not run"); }
    }
  });
  const failed = await startOllama({
    platform: { isMacOS: true },
    runner: {
      findExecutable: async () => "/usr/local/bin/ollama",
      start: async () => { throw new Error("spawn failed"); }
    }
  });

  assert.equal(missing.errorCode, "ollama-not-found");
  assert.equal(failed.errorCode, "start-failed");
});

test("startOllama classifies an occupied port reported during spawn", async () => {
  const result = await startOllama({
    platform: { isMacOS: true },
    runner: {
      findExecutable: async () => "/usr/local/bin/ollama",
      start: async () => { throw new Error("listen EADDRINUSE: address already in use"); }
    }
  });

  assert.equal(result.errorCode, "port-busy");
});

test("waitUntilOllamaReady retries until the Ollama API becomes available", async () => {
  let attempts = 0;
  const result = await waitUntilOllamaReady({
    baseUrl: "http://localhost:11434",
    pollIntervalMs: 0,
    maxAttempts: 3,
    fetcher: async () => {
      attempts++;
      if (attempts < 3) throw new TypeError("fetch failed");
      return new Response(JSON.stringify({ version: "0.35.1" }), { status: 200 });
    }
  });

  assert.equal(result.state, "running");
  assert.equal(attempts, 3);
});

test("waitUntilOllamaReady returns start-timeout after bounded attempts", async () => {
  const result = await waitUntilOllamaReady({
    baseUrl: "http://localhost:11434",
    pollIntervalMs: 0,
    maxAttempts: 2,
    fetcher: async () => { throw new TypeError("fetch failed"); }
  });

  assert.equal(result.state, "error");
  assert.equal(result.errorCode, "start-timeout");
});

test("waitUntilOllamaReady aborts a hanging request at the overall deadline", async () => {
  const startedAt = Date.now();
  const result = await waitUntilOllamaReady({
    baseUrl: "http://localhost:11434",
    startDeadlineMs: 10,
    maxAttempts: 1,
    fetcher: (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    })
  });

  assert.equal(result.errorCode, "start-timeout");
  assert.ok(Date.now() - startedAt < 250);
});

test("orchestrator stops before translation flow when the user cancels", async () => {
  const ui = createUi(["cancel"]);
  const result = await ensureOllamaRunning({
    baseUrl: "http://localhost:11434",
    fetcher: async () => { throw new TypeError("connect ECONNREFUSED"); },
    runner: unusedRunner(),
    isMacOS: true,
    ui
  });

  assert.equal(result, false);
  assert.deepEqual(ui.seenStates, ["stopped"]);
});

test("orchestrator finishes immediately when progress cancellation aborts the check", async () => {
  let actionPrompts = 0;
  let errors = 0;
  const ui: PreflightUi = {
    runCheck: (task) => {
      const controller = new AbortController();
      controller.abort();
      return task(controller.signal);
    },
    runStart: (task) => task(new AbortController().signal),
    chooseAction: async () => {
      actionPrompts++;
      return "cancel";
    },
    showRunning: () => undefined,
    showError: () => { errors++; }
  };

  const result = await ensureOllamaRunning({
    baseUrl: "http://localhost:11434",
    fetcher: async (_input, init) => {
      if (init?.signal?.aborted) throw new Error("aborted");
      throw new Error("must be aborted");
    },
    runner: unusedRunner(),
    isMacOS: false,
    ui
  });

  assert.equal(result, false);
  assert.equal(actionPrompts, 0);
  assert.equal(errors, 0);
});

test("orchestrator does not offer local start on an unsupported platform", async () => {
  let receivedStatus: OllamaStatus | undefined;
  const ui: PreflightUi = {
    runCheck: (task) => task(new AbortController().signal),
    runStart: (task) => task(new AbortController().signal),
    chooseAction: async (status) => {
      receivedStatus = status;
      return "cancel";
    },
    showRunning: () => undefined,
    showError: () => undefined
  };

  await ensureOllamaRunning({
    baseUrl: "http://localhost:11434",
    fetcher: async () => { throw new TypeError("connect ECONNREFUSED"); },
    runner: unusedRunner(),
    isMacOS: false,
    ui
  });

  assert.equal(receivedStatus?.canStartLocal, false);
});

test("orchestrator starts Ollama, waits for readiness, then continues", async () => {
  let fetchCalls = 0;
  let processStarts = 0;
  const ui = createUi(["start"]);
  const result = await ensureOllamaRunning({
    baseUrl: "http://localhost:11434",
    fetcher: async () => {
      fetchCalls++;
      if (fetchCalls === 1) throw new TypeError("connect ECONNREFUSED");
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

  assert.equal(result, true);
  assert.equal(processStarts, 1);
  assert.equal(ui.runningNotifications, 1);
});

test("orchestrator stops only the process it started when readiness times out", async () => {
  let fetchCalls = 0;
  let stops = 0;
  const ui = createUi(["start", "cancel"]);
  const result = await ensureOllamaRunning({
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

  assert.equal(result, false);
  assert.ok(fetchCalls >= 2);
  assert.equal(stops, 1);
});

test("orchestrator classifies an occupied Ollama port from early process exit", async () => {
  const ui = createUi(["start", "cancel"]);
  await ensureOllamaRunning({
    baseUrl: "http://localhost:11434",
    fetcher: async () => { throw new TypeError("connect ECONNREFUSED"); },
    runner: {
      findExecutable: async () => "/usr/local/bin/ollama",
      start: async () => ({
        exited: Promise.resolve({
          code: 1,
          signal: null,
          stderr: "listen tcp 127.0.0.1:11434: bind: address already in use"
        }),
        stop: async () => undefined
      })
    },
    isMacOS: true,
    ui
  });

  assert.deepEqual(ui.errorCodes, ["port-busy"]);
});

function createUi(actions: PreflightAction[]): PreflightUi & {
  seenStates: string[];
  runningNotifications: number;
  errorCodes: Array<string | undefined>;
} {
  const seenStates: string[] = [];
  const ui = {
    seenStates,
    runningNotifications: 0,
    errorCodes: [] as Array<string | undefined>,
    runCheck: (task: (signal: AbortSignal) => Promise<OllamaStatus>) => task(new AbortController().signal),
    runStart: (task: (signal: AbortSignal) => Promise<OllamaStatus>) => task(new AbortController().signal),
    async chooseAction(status: OllamaStatus): Promise<PreflightAction> {
      seenStates.push(status.state);
      return actions.shift() ?? "cancel";
    },
    showRunning(): void {
      ui.runningNotifications++;
    },
    showError(errorCode: ErrorCode | undefined): void {
      ui.errorCodes.push(errorCode);
    }
  };
  return ui;
}

function unusedRunner(): ProcessRunner {
  return {
    findExecutable: async () => { throw new Error("must not resolve executable"); },
    start: async () => { throw new Error("must not start process"); }
  };
}
