export type ClaudeState = "ok" | "missing" | "signed-out";
export type HiggsfieldState = "ok" | "missing" | "needs-auth" | "failed" | "unknown";

/** Whether the background Claude can run and reach Higgsfield. `problem` is the sentence the app shows; null when all is fine. */
export type Setup = {
  claude: ClaudeState;
  higgsfield: HiggsfieldState;
  problem: string | null;
  checkedAt: string;
};

/** What one run of the Claude Code CLI gave back. `started` is false when the executable could not be found. */
export type CliOutput = { started: boolean; code: number | null; stdout: string };
