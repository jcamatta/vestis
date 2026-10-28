type ContentBlock = { type?: string; name?: string; input?: unknown };
type StreamEvent = { type?: string; message?: { content?: unknown } };

/** Names of the tools Claude calls in one `stream-json` line; empty for any other line. */
export const toolUses = (line: string): string[] => {
  try {
    const event = JSON.parse(line) as StreamEvent;
    const content = event.type === "assistant" ? event.message?.content : undefined;
    return Array.isArray(content)
      ? (content as ContentBlock[]).filter((b: ContentBlock): boolean => b.type === "tool_use" && typeof b.name === "string").map((b: ContentBlock): string => b.name as string)
      : [];
  } catch {
    return [];
  }
};

/** The steps of a try-on run, in order. */
export const GENERATION_STEPS = [
  "Starting Claude",
  "Writing the prompt",
  "Uploading images to Higgsfield",
  "Sending to Higgsfield",
  "Higgsfield is generating",
  "Getting the result",
  "Downloading the result",
] as const;

const TOOL_STEPS: Record<string, string> = {
  Read: "Writing the prompt",
  media_upload: "Uploading images to Higgsfield",
  Bash: "Uploading images to Higgsfield",
  media_confirm: "Uploading images to Higgsfield",
  generate_image: "Sending to Higgsfield",
  jobs_wait: "Higgsfield is generating",
  job_display: "Getting the result",
  show_generation_by_ids: "Getting the result",
};

const rank = (step: string): number => GENERATION_STEPS.indexOf(step as (typeof GENERATION_STEPS)[number]);

export type GenerationStepInput = { tool: string; prefix: string; current: string };

/** The step a try-on run has reached after Claude calls a tool; null when it has not moved forward. */
export const generationStep = (input: GenerationStepInput): string | null => {
  const name = input.tool.startsWith(input.prefix) ? input.tool.slice(input.prefix.length) : input.tool;
  const next = TOOL_STEPS[name];
  return next !== undefined && rank(next) > rank(input.current) ? next : null;
};
