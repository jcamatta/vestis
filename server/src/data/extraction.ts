import type { GarmentSource } from "./garment.js";
import type { ImageFile } from "./image-file.js";
import type { Slot } from "./slot.js";

export type ExtractionStatus = "analyzing" | "ready" | "queued" | "extracting" | "done" | "error";

/** One item Claude saw on the person. */
export type ExtractionItem = {
  slot: Slot;
  name: string;
  brand: string | null;
  /** Same style as a garment description; it becomes the extracted garment's description. */
  description: string;
  /** Ticked by the user: only these are extracted. */
  selected: boolean;
  /** The garment cut from the result, once done. */
  garmentId: string | null;
};

/** One product Google Lens showed for an item's cut-out. */
export type ShopOffer = {
  shop: string;
  title: string;
  url: string;
  /** As shown on the page; null when it shows none. */
  price: number | null;
  currency: string | null;
};

export type ShopStatus = "none" | "searching" | "done" | "error";

/** One item's Lens search, same order as the items; each item is searched on its own. */
export type ShoppingItem = {
  status: ShopStatus;
  /** What happened, e.g. "Lens found 7 products." or why it failed. */
  summary: string;
  offers: ShopOffer[];
  searchedAt: string | null;
};

/** A rough outfit price: per item the lowest and highest offer in one currency, summed over the items that have one. */
export type ShoppingTotal = { currency: string; min: number; max: number; priced: number; of: number };

export type Shopping = { items: ShoppingItem[]; total: ShoppingTotal | null };

/** A photo of a dressed person, turned into separate product photos by one generation. */
export type Extraction = {
  id: string;
  name: string;
  /** The outfit photo. */
  image: ImageFile;
  /** Set when it came from the extension. */
  source: GarmentSource | null;
  status: ExtractionStatus;
  /** What a running extraction is doing right now. */
  step: string | null;
  error: string | null;
  items: ExtractionItem[];
  model: string;
  prompt: string | null;
  /** Higgsfield media id of the uploaded photo, reused on retry. */
  higgsfieldMediaId: string | null;
  jobId: string | null;
  /** The generated grid of product shots. */
  result: ImageFile | null;
  createdAt: string;
  finishedAt: string | null;
  /** Where to buy the items: Google Lens on each cut-out, run by the extension in the user's Chrome. */
  shopping: Shopping | null;
};

/** A crop rectangle as fractions of the image, 0–1. */
export type Box = { left: number; top: number; width: number; height: number };
