import type { Result } from "../data/result.js";
import { fail, ok } from "./result.js";

type CliOutput = { is_error?: boolean; result?: unknown; structured_output?: unknown };

const firstJsonObject = (text: string): unknown => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
};

const parseLine = (line: string): CliOutput | undefined => {
  try {
    const value = JSON.parse(line) as unknown;
    return typeof value === "object" && value !== null && "result" in value ? (value as CliOutput) : undefined;
  } catch {
    return undefined;
  }
};

/** The last line carrying a result; stream-json ends with it, and MCP clients sometimes print stray log lines around it. */
const findResult = (stdout: string): CliOutput | undefined =>
  stdout.split(/\r?\n/).map(parseLine).filter((v: CliOutput | undefined): boolean => v !== undefined).at(-1);

/** Reads `claude -p --output-format stream-json`: the structured answer, or the reason there is none. */
export const parseClaudeOutput = (stdout: string): Result<unknown> => {
  const cli = findResult(stdout);
  if (!cli) return fail(`Claude returned no JSON: ${stdout.slice(0, 300)}`);
  if (cli.structured_output !== undefined && cli.structured_output !== null) return ok(cli.structured_output);
  const text = typeof cli.result === "string" ? cli.result : "";
  if (cli.is_error && /authenticat|log ?in/i.test(text)) return fail("Claude Code is not logged in: open a terminal, run claude, then /login.");
  if (cli.is_error) return fail(`Claude Code failed: ${text.slice(0, 300)}`);
  const parsed = firstJsonObject(text);
  return parsed === undefined ? fail(`Claude gave no structured answer: ${text.slice(0, 300)}`) : ok(parsed);
};
