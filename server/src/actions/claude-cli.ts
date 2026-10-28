import { spawn } from "node:child_process";
import { homedir } from "node:os";
import type { CliOutput } from "../data/setup.js";

export const BIN = process.env.VESTIS_CLAUDE_BIN ?? "claude";

/** A child started from inside a Claude Code session would otherwise think it is nested. */
export const childEnv = (): NodeJS.ProcessEnv =>
  Object.fromEntries(Object.entries(process.env).filter(([key]: [string, string | undefined]): boolean => key !== "CLAUDECODE" && !key.startsWith("CLAUDE_CODE_")));

export type RunCliInput = { args: string[]; timeoutMs: number };

/** Runs one short Claude Code CLI command from the home folder (so no project MCP config applies) and collects its stdout. */
export const runCli = (input: RunCliInput): Promise<CliOutput> =>
  new Promise((resolve: (output: CliOutput) => void): void => {
    const child = spawn(BIN, input.args, { cwd: homedir(), env: childEnv(), windowsHide: true });
    let stdout = "";
    const timer = setTimeout((): void => {
      child.kill();
    }, input.timeoutMs);
    child.stdout.on("data", (chunk: Buffer): void => {
      stdout += chunk.toString("utf8");
    });
    child.on("error", (): void => {
      clearTimeout(timer);
      resolve({ started: false, code: null, stdout });
    });
    child.on("close", (code: number | null): void => {
      clearTimeout(timer);
      resolve({ started: true, code, stdout });
    });
  });
