export type ClaudeRun = {
  /** The task, sent on stdin. */
  prompt: string;
  /** JSON Schema of the structured answer. */
  schema: object;
  /** Tools the run may use, all pre-approved. */
  tools: string[];
  /** Folders the run may read besides its working directory. */
  dirs: string[];
  /** Hard stop. */
  timeoutMs: number;
};
