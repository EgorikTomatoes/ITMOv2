import type { ProcessRunner } from "../process/ollamaRunner";
import { checkOllamaStatus } from "./checkOllamaStatus";
import { startOllama } from "./startOllama";
import type { ErrorCode, FetchLike, OllamaStatus } from "./types";
import { waitUntilOllamaReady } from "./waitUntilOllamaReady";
import type { WaitOptions } from "./waitUntilOllamaReady";

export type PreflightAction = "start" | "retry" | "cancel";

export interface PreflightUi {
  runCheck(task: (signal: AbortSignal) => Promise<OllamaStatus>): Promise<OllamaStatus>;
  runStart(task: (signal: AbortSignal) => Promise<OllamaStatus>): Promise<OllamaStatus>;
  chooseAction(status: OllamaStatus): Promise<PreflightAction>;
  showRunning(): void;
  showError(errorCode?: ErrorCode): void;
}

export interface OrchestratorDeps {
  fetcher: FetchLike;
  baseUrl: string;
  runner: ProcessRunner;
  isMacOS: boolean;
  ui: PreflightUi;
  waitOptions?: Pick<WaitOptions, "startDeadlineMs" | "pollIntervalMs" | "maxAttempts">;
}

export async function ensureOllamaRunning(deps: OrchestratorDeps): Promise<boolean> {
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
      const started = await startOllama({
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
      const ready = await waitUntilOllamaReady({
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

function runCheck(deps: OrchestratorDeps): Promise<OllamaStatus> {
  return deps.ui.runCheck((signal) => checkOllamaStatus(deps.fetcher, {
    baseUrl: deps.baseUrl,
    signal
  }));
}
