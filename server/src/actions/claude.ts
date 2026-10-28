import { spawn } from "node:child_process";
import type { ClaudeRun } from "../data/claude.js";
import type { Result } from "../data/result.js";
import { parseClaudeOutput } from "../pure/claude-output.js";
import { toolUses } from "../pure/claude-stream.js";
import { fail } from "../pure/result.js";

const BIN = process.env.VESTIS_CLAUDE_BIN ?? "claude";
const MODEL = process.env.VESTIS_CLAUDE_MODEL ?? "sonnet";

/** A child started from inside a Claude Code session would otherwise think it is nested. */
const childEnv = (): NodeJS.ProcessEnv =>
  Object.fromEntries(Object.entries(process.env).filter(([key]: [string, string | undefined]): boolean => key !== "CLAUDECODE" && !key.startsWith("CLAUDE_CODE_")));

const args = (run: ClaudeRun): string[] => [
  "-p",
  "--output-format", "stream-json",
  "--verbose",
  "--json-schema", JSON.stringify(run.schema),
  "--model", MODEL,
  "--permission-mode", "dontAsk",
  "--allowedTools", run.tools.join(","),
  "--no-session-persistence",
  ...run.dirs.flatMap((dir: string): string[] => ["--add-dir", dir]),
];

export type RunClaudeInput = { run: ClaudeRun; cwd: string; onTool?: (tool: string) => void };

/** Runs headless Claude Code with the task on stdin, reports each tool it calls, and returns its structured answer. */
export const runClaude = (input: RunClaudeInput): Promise<Result<unknown>> =>
  new Promise((resolve: (result: Result<unknown>) => void): void => {
    const child = spawn(BIN, args(input.run), { cwd: input.cwd, env: childEnv(), windowsHide: true });
    let stdout = "";
    let stderr = "";
    let pending = "";
    const timer = setTimeout((): void => {
      child.kill();
      resolve(fail(`Claude did not finish within ${Math.round(input.run.timeoutMs / 1000)} s.`));
    }, input.run.timeoutMs);
    child.stdout.on("data", (chunk: Buffer): void => {
      const text = chunk.toString("utf8");
      stdout += text;
      const lines = (pending + text).split(/\r?\n/);
      pending = lines.pop() ?? "";
      if (input.onTool) lines.flatMap(toolUses).forEach(input.onTool);
    });
    child.stderr.on("data", (chunk: Buffer): void => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error: Error): void => {
      clearTimeout(timer);
      resolve(fail(`Could not start Claude Code (${BIN}): ${error.message}`));
    });
    child.on("close", (code: number | null): void => {
      clearTimeout(timer);
      if (stdout.trim() === "") resolve(fail(`Claude Code exited with ${code}: ${stderr.trim().slice(0, 400) || "no output"}`));
      else resolve(parseClaudeOutput(stdout));
    });
    child.stdin.end(input.run.prompt, "utf8");
  });
