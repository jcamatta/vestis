import { createQueue } from "./queue.js";

/** Claude reading a photo: short and free, two at a time. */
export const analysisQueue = createQueue(2);

/** Anything that spends Higgsfield credits (looks and extractions): one at a time, in order. */
export const generationQueue = createQueue(1);

export const HF_TOOL_PREFIX = process.env.VESTIS_HF_TOOLS_PREFIX ?? "mcp__higgsfield__";

/** The Higgsfield tools a generation run may call. */
export const HF_TOOLS = ["media_upload", "media_confirm", "generate_image", "jobs_wait", "job_display", "show_generation_by_ids"].map(
  (t: string): string => `${HF_TOOL_PREFIX}${t}`,
);
