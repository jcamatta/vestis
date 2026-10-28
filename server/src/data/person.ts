import type { AnalysisStatus } from "./garment.js";
import type { ImageFile } from "./image-file.js";
import type { Slot } from "./slot.js";

export type Person = {
  id: string;
  name: string;
  image: ImageFile;
  /** Slots whose body part is visible in the photo; only these can be tried on. */
  visibleSlots: Slot[];
  /** e.g. "full body, front, standing, arms crossed, daylight". */
  summary: string;
  /** Higgsfield media id of the uploaded photo, reused across looks. */
  higgsfieldMediaId: string | null;
  status: AnalysisStatus;
  error: string | null;
  createdAt: string;
};
