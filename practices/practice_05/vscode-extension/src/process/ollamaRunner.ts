import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { delimiter, join } from "node:path";

export interface StartedProcess {
  pid?: number;
  exited: Promise<{ code: number | null; signal: string | null; stderr?: string }>;
  stop(): Promise<void>;
}

export interface ProcessRunner {
  findExecutable(command: string): Promise<string | undefined>;
  start(executable: string, args: readonly string[]): Promise<StartedProcess>;
}

const MACOS_OLLAMA_LOCATIONS = [
  "/usr/local/bin/ollama",
  "/opt/homebrew/bin/ollama",
  "/Applications/Ollama.app/Contents/Resources/ollama"
];

export function createNodeProcessRunner(
  environment: NodeJS.ProcessEnv = process.env
): ProcessRunner {
  return {
    async findExecutable(command): Promise<string | undefined> {
      const pathCandidates = (environment.PATH ?? "")
        .split(delimiter)
        .filter(Boolean)
        .map((directory) => join(directory, command));
      const candidates = [...new Set([...pathCandidates, ...MACOS_OLLAMA_LOCATIONS])];

      for (const candidate of candidates) {
        try {
          await access(candidate, constants.X_OK);
          return candidate;
        } catch {
          // Try the next known executable location.
        }
      }
      return undefined;
    },

    async start(executable, args): Promise<StartedProcess> {
      const child = spawn(executable, [...args], {
        detached: true,
        stdio: ["ignore", "ignore", "pipe"]
      });
      let stderr = "";
      child.stderr?.on("data", (chunk: Buffer | string) => {
        // Startup diagnostics are used only for classification and kept bounded.
        stderr = `${stderr}${String(chunk)}`.slice(-4096);
      });
      const exited = new Promise<{ code: number | null; signal: string | null; stderr?: string }>((resolve) => {
        child.once("exit", (code, signal) => resolve({ code, signal, stderr }));
      });

      await new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      child.unref();
      return {
        pid: child.pid,
        exited,
        async stop(): Promise<void> {
          if (child.pid === undefined || child.exitCode !== null || child.killed) {
            return;
          }
          try {
            process.kill(-child.pid, "SIGTERM");
          } catch (error) {
            if (!isNoSuchProcessError(error)) {
              throw error;
            }
          }
        }
      };
    }
  };
}

function isNoSuchProcessError(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    "code" in error && error.code === "ESRCH";
}
