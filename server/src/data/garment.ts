import type { ImageFile } from "./image-file.js";
import type { Slot } from "./slot.js";

export type AnalysisStatus = "analyzing" | "ready" | "error";

/** `site` is "extracted" for garments cut from an outfit photo, with `extractionId` pointing at it. */
export type GarmentSource = { pageUrl: string; pageTitle: string; imageUrl: string; site: string; extractionId?: string };

export type Garment = {
  id: string;
  /** null until Claude has decided, when the user picked "auto". */
  slot: Slot | null;
  name: string;
  brand: string | null;
  /** Short try-on phrase, e.g. "orange zip-up track jacket with a white chest logo". */
  description: string;
  image: ImageFile;
  source: GarmentSource;
  status: AnalysisStatus;
  error: string | null;
  createdAt: string;
};
