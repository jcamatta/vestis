/** Whether the background Claude can run and reach Higgsfield. `problem` is the sentence to show; null when all is fine. */
export type Setup = {
  claude: 'ok' | 'missing' | 'signed-out';
  higgsfield: 'ok' | 'missing' | 'needs-auth' | 'failed' | 'unknown';
  problem: string | null;
  checkedAt: string;
};
