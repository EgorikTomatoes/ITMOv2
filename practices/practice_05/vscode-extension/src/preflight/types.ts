export type State = "running" | "stopped" | "starting" | "error";

export type ErrorCode =
  | "health-timeout"
  | "http-error"
  | "network-error"
  | "user-cancelled"
  | "unsupported-platform"
  | "ollama-not-found"
  | "port-busy"
  | "start-timeout"
  | "start-failed";

export interface OllamaStatus {
  state: State;
  message?: string;
  errorCode?: ErrorCode;
  canStartLocal?: boolean;
}

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; signal?: AbortSignal }
) => Promise<Response>;

export interface StartResult {
  ok: boolean;
  message?: string;
  errorCode?: ErrorCode;
  startedProcess?: StartedProcess;
}
import type { StartedProcess } from "../process/ollamaRunner";

