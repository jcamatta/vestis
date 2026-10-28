import type { ImageFile } from "./image-file.js";
import type { Fit, Slot } from "./slot.js";

export type LookStatus = "queued" | "preparing" | "generating" | "done" | "error";

export type LookItem = { slot: Slot; garmentId: string; fit: Fit | null };

export type Look = {
  id: string;
  personId: string;
  items: LookItem[];
  model: string;
  status: LookStatus;
  /** What a running look is doing right now, e.g. "Higgsfield is generating". */
  step: string | null;
  prompt: string | null;
  canvas: ImageFile | null;
  result: ImageFile | null;
  jobId: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};
