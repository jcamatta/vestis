import type { Fit, Slot } from './slot';

export type ImageFile = { file: string; width: number; height: number };

export type AnalysisStatus = 'analyzing' | 'ready' | 'error';

export type GarmentSource = { pageUrl: string; pageTitle: string; imageUrl: string; site: string; extractionId?: string };

export type Garment = {
  id: string;
  slot: Slot | null;
  name: string;
  brand: string | null;
  description: string;
  image: ImageFile;
  /** `site` is "extracted" for garments cut from an outfit photo. */
  source: GarmentSource;
  status: AnalysisStatus;
  error: string | null;
  createdAt: string;
};

export type Person = {
  id: string;
  name: string;
  image: ImageFile;
  visibleSlots: Slot[];
  summary: string;
  higgsfieldMediaId: string | null;
  status: AnalysisStatus;
  error: string | null;
  createdAt: string;
};

export type LookStatus = 'queued' | 'preparing' | 'generating' | 'done' | 'error';

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

export type ExtractionStatus = 'analyzing' | 'ready' | 'queued' | 'extracting' | 'done' | 'error';

export type ExtractionItem = { slot: Slot; name: string; brand: string | null; description: string; selected: boolean; garmentId: string | null };

/** One product Google Lens showed for an item's cut-out. */
export type ShopOffer = { shop: string; title: string; url: string; price: number | null; currency: string | null };

export type ShopStatus = 'none' | 'searching' | 'done' | 'error';

/** One item's Lens search. */
export type ShoppingItem = { status: ShopStatus; summary: string; offers: ShopOffer[]; searchedAt: string | null };

export type ShoppingTotal = { currency: string; min: number; max: number; priced: number; of: number };

/** Where to buy the items: Google Lens on each cut-out, read by the extension; one entry per item. */
export type Shopping = { items: ShoppingItem[]; total: ShoppingTotal | null };

/** A photo of a dressed person, turned into separate product photos by one generation. */
export type Extraction = {
  id: string;
  name: string;
  image: ImageFile;
  source: GarmentSource | null;
  status: ExtractionStatus;
  step: string | null;
  error: string | null;
  items: ExtractionItem[];
  model: string;
  prompt: string | null;
  higgsfieldMediaId: string | null;
  jobId: string | null;
  result: ImageFile | null;
  createdAt: string;
  finishedAt: string | null;
  shopping: Shopping | null;
};

/** A cut-out the extension opens in Google Lens. */
export type LensItem = { index: number; name: string; imageUrl: string };

export type Wardrobe = { version: 3; updatedAt: string; people: Person[]; garments: Garment[]; looks: Look[]; extractions: Extraction[] };

export type ModelOption = { id: string; label: string; short: string };
