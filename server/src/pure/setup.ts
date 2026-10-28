import type { ClaudeState, CliOutput, HiggsfieldState } from "../data/setup.js";

const FIX = "Run  npm run setup  again in the Vestis folder (see the README), then reopen Vestis.";

export const CLAUDE_MISSING = `Claude Code is not installed. ${FIX}`;
export const CLAUDE_SIGNED_OUT = `Claude is signed out. ${FIX}`;

/** `mcp__higgsfield__` → `higgsfield`: the name the MCP was added under in the CLI. */
export const serverNameFrom = (prefix: string): string => prefix.replace(/^mcp__/, "").replace(/__$/, "");

/** Reads `claude auth status` (JSON with `loggedIn`). */
export const claudeStateFrom = (output: CliOutput): ClaudeState => {
  if (!output.started) return "missing";
  return /"loggedIn"\s*:\s*true/.test(output.stdout) ? "ok" : "signed-out";
};

/** Reads `claude mcp get <name>`: its `Status:` line, or a non-zero exit when the server was never added. */
export const higgsfieldStateFrom = (output: CliOutput): HiggsfieldState => {
  if (!output.started) return "unknown";
  if (output.code !== 0) return "missing";
  const status = output.stdout.split(/\r?\n/).find((line: string): boolean => /^\s*Status:/i.test(line)) ?? "";
  if (/connected/i.test(status) && !/fail|not/i.test(status)) return "ok";
  if (/auth/i.test(status)) return "needs-auth";
  return "failed";
};

export type ProblemInput = { claude: ClaudeState; higgsfield: HiggsfieldState };

/** One plain sentence: what is wrong and what to do. Claude first, since Higgsfield runs inside it. */
export const setupProblem = (input: ProblemInput): string | null => {
  if (input.claude === "missing") return CLAUDE_MISSING;
  if (input.claude === "signed-out") return CLAUDE_SIGNED_OUT;
  if (input.higgsfield === "missing") return `Higgsfield is not connected to Claude. ${FIX}`;
  if (input.higgsfield === "needs-auth") return `Higgsfield needs you to sign in again. ${FIX}`;
  if (input.higgsfield === "failed") return "Higgsfield is not answering. Check the internet connection and press Check again. If it keeps failing, run  npm run setup  again.";
  if (input.higgsfield === "unknown") return "Could not check Higgsfield. Press Check again.";
  return null;
};
