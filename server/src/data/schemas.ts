import { z } from "zod";
import { BOTTOM_FITS, SLOTS, TOP_FITS } from "./slot.js";

export const slotSchema = z.enum(SLOTS);
export const fitSchema = z.enum([...TOP_FITS, ...BOTTOM_FITS]);

/** From the extension. The image comes as base64 bytes (fetched by the extension) or, failing that, as a URL. */
export const garmentRequestSchema = z.object({
  imageUrl: z.string(),
  imageBase64: z.string().optional(),
  pageUrl: z.string().default(""),
  pageTitle: z.string().default(""),
  slot: slotSchema.nullable().default(null),
});
export type GarmentRequest = z.infer<typeof garmentRequestSchema>;

/** From the extension's "Extract outfit"; the web app sends raw image bytes instead. */
export const extractionRequestSchema = garmentRequestSchema.omit({ slot: true });

/** Indexes of the ticked items. */
export const extractionPatchSchema = z.object({ selected: z.array(z.number().int().min(0)) });

export const outfitAnswerSchema = z.object({
  items: z
    .array(z.object({ slot: slotSchema, name: z.string().min(1), brand: z.string().nullable(), description: z.string().min(1) }))
    .max(6),
});

const boxSchema = z.object({ left: z.number(), top: z.number(), width: z.number(), height: z.number() });

export const boxesAnswerSchema = z.object({ boxes: z.array(boxSchema.nullable()) });

export const lookRequestSchema = z.object({
  personId: z.string(),
  model: z.string(),
  items: z.array(z.object({ slot: slotSchema, garmentId: z.string(), fit: fitSchema.nullable().default(null) })).min(1).max(5),
});

export const garmentPatchSchema = z.object({ slot: slotSchema.optional(), name: z.string().min(1).optional() });

export const garmentAnswerSchema = z.object({
  slot: slotSchema,
  name: z.string().min(1),
  brand: z.string().nullable(),
  description: z.string().min(1),
});

export const personAnswerSchema = z.object({ visibleSlots: z.array(slotSchema), summary: z.string() });

export const generationAnswerSchema = z.object({
  ok: z.boolean(),
  prompt: z.string(),
  personMediaId: z.string().nullable(),
  jobId: z.string().nullable(),
  resultUrl: z.string().nullable(),
  error: z.string().nullable(),
});

const offerSchema = z.object({
  shop: z.string().max(200),
  title: z.string().max(400),
  url: z.string().max(4000),
  price: z.number().nullable(),
  currency: z.string().max(8).nullable(),
});

/** From the extension: the products it read on each item's Lens page; error when that page could not be read. */
export const lensResultsSchema = z.object({
  items: z.array(z.object({ index: z.number().int().min(0), offers: z.array(offerSchema).max(50), error: z.string().max(400).nullable().default(null) })),
});

/** Which items to search with Lens; all extracted ones when left out. */
export const shopRequestSchema = z.object({ indexes: z.array(z.number().int().min(0)).optional() });
