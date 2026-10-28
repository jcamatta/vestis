import type { Garment } from "../data/garment.js";
import type { LookItem } from "../data/look.js";
import type { TryOnModel } from "../data/model.js";

const SLOT_ENUM = { type: "string", enum: ["head", "eyewear", "top", "bottom", "shoes"] };

export const garmentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["slot", "name", "brand", "description"],
  properties: {
    slot: SLOT_ENUM,
    name: { type: "string" },
    brand: { type: ["string", "null"] },
    description: { type: "string" },
  },
};

export const personSchema = {
  type: "object",
  additionalProperties: false,
  required: ["visibleSlots", "summary"],
  properties: {
    visibleSlots: { type: "array", items: SLOT_ENUM },
    summary: { type: "string" },
  },
};

export const generationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "prompt", "personMediaId", "jobId", "resultUrl", "error"],
  properties: {
    ok: { type: "boolean" },
    prompt: { type: "string" },
    personMediaId: { type: ["string", "null"] },
    jobId: { type: ["string", "null"] },
    resultUrl: { type: ["string", "null"] },
    error: { type: ["string", "null"] },
  },
};

export type GarmentTaskInput = { imagePath: string; pageTitle: string; pageUrl: string; slot: string | null };

export const garmentTask = (input: GarmentTaskInput): string => `You catalogue clothing for a virtual try-on app. Look at one product photo and describe the garment.

Product photo (read it with the Read tool): ${input.imagePath}
Shop page title: ${input.pageTitle || "(none)"}
Shop page URL: ${input.pageUrl || "(none)"}
${input.slot ? `The user filed it under: ${input.slot}. Use that slot.` : "The user did not choose a slot: decide it."}

Slots: head = hats, caps, beanies, headbands, headwear. eyewear = glasses, sunglasses. top = t-shirts, shirts, sweaters, hoodies, jackets, coats, dresses. bottom = trousers, jeans, shorts, skirts, leggings. shoes = any footwear.

If the photo shows a person wearing several items, describe only the product being sold (use the page title to tell which one).

Answer with:
- slot
- name: 2–5 words a shop would use, e.g. "Orange track jacket".
- brand: the brand if the page or the garment shows it, else null.
- description: one short noun phrase for an image model, without articles, in this order: colour, material or texture if obvious, garment type, fit or length if visible, then visible text, logos, prints or trims. Example: "orange lightweight zip-up track jacket with a small white chest logo and black side zips". No opinions, no styling words, no mention of the model or background.

Do not use any tool other than Read.`;

export type PersonTaskInput = { imagePath: string };

export const personTask = (input: PersonTaskInput): string => `You check photos of a person for a virtual try-on app.

Photo (read it with the Read tool): ${input.imagePath}

Decide which body areas are visible, because only those can be dressed:
- head: the head is visible.
- eyewear: the face is visible from the front or three-quarter, so glasses would show.
- top: the torso is visible.
- bottom: the hips and at least most of the legs are visible.
- shoes: both feet are clearly visible, not cropped by the frame or hidden.

Answer with:
- visibleSlots: the visible areas, in the order head, eyewear, top, bottom, shoes.
- summary: one short line about framing, angle, pose and light, e.g. "full body, front, standing, arms crossed, night with warm lights".

Do not use any tool other than Read.`;

export type GenerationTaskInput = {
  model: TryOnModel;
  skillPath: string;
  personPath: string;
  personMediaId: string | null;
  canvasPath: string;
  items: LookItem[];
  garments: Garment[];
  aspectRatio: string;
  toolPrefix: string;
};

const garmentLine = (input: { item: LookItem; garment: Garment }): string =>
  `- ${input.item.slot}: ${input.garment.description}${input.item.fit ? ` — fit chosen by the user: ${input.item.fit}` : ""}`;

export const generationTask = (input: GenerationTaskInput): string => {
  const t = (name: string): string => `${input.toolPrefix}${name}`;
  const lines = input.items.map((item: LookItem, i: number): string => garmentLine({ item, garment: input.garments[i] as Garment }));
  const params = JSON.stringify(input.model.params);
  return `You run one virtual try-on through the Higgsfield MCP. Work silently and finish with the structured answer.

Inputs
- Model: ${input.model.id}
- Prompt skill for this model (read it first with Read, follow it exactly): ${input.skillPath}
- Image 1, the person: ${input.personPath}${input.personMediaId ? ` — already uploaded, Higgsfield media id ${input.personMediaId}` : ""}
- Image 2, the garments (one canvas, in the order listed): ${input.canvasPath}
- Garments, in order:
${lines.join("\n")}

Steps
1. Read the skill and write the prompt from the garment list.
2. Upload what is not uploaded yet: call ${t("media_upload")} with the file name, PUT the file bytes to the returned upload URL with curl (e.g. curl -sS -X PUT -H "Content-Type: image/jpeg" --data-binary @"<path>" "<upload_url>"), then ${t("media_confirm")}. Do this for image 2 always, and for image 1 only if it has no media id. If an existing media id for image 1 is rejected, upload image 1 again.
3. Call ${t("generate_image")} once with params: model "${input.model.id}", the prompt, aspect_ratio "${input.aspectRatio}", the model params ${params}, count 1, use_unlim false, no folder_id, and medias in this order: [{ value: <image 1 id>, role: "image_references" }, { value: <image 2 id>, role: "image_references" }]. Do not create projects or folders. Do not call any other generation tool.
4. Wait for the job with ${t("jobs_wait")} until it finishes, then get the full-resolution result image URL (use ${t("job_display")} or ${t("show_generation_by_ids")} if jobs_wait does not give it).

Answer
- ok: true only if you have the result image URL.
- prompt: the exact prompt you sent.
- personMediaId: the media id used for image 1.
- jobId, resultUrl: from the job.
- error: null, or one sentence saying what failed (credits, moderation, upload…).
If the job ends as "nsfw" or is otherwise blocked by moderation, do not retry: answer ok false with error "Blocked by Higgsfield's safety filter." Retry the generation once only for other failures (timeout, server error). Never ask questions.`;
};

const ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["slot", "name", "brand", "description"],
  properties: { slot: SLOT_ENUM, name: { type: "string" }, brand: { type: ["string", "null"] }, description: { type: "string" } },
};

export const outfitSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: { items: { type: "array", maxItems: 6, items: ITEM_SCHEMA } },
};

const BOX_SCHEMA = {
  type: ["object", "null"],
  additionalProperties: false,
  required: ["left", "top", "width", "height"],
  properties: { left: { type: "number" }, top: { type: "number" }, width: { type: "number" }, height: { type: "number" } },
};

export const boxesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["boxes"],
  properties: { boxes: { type: "array", items: BOX_SCHEMA } },
};

export type OutfitTaskInput = { imagePath: string; pageTitle: string };

export const outfitTask = (input: OutfitTaskInput): string => `You catalogue clothing for a virtual try-on app. Look at one photo of a dressed person and list what they wear, so each item can be turned into its own product photo.

Photo (read it with the Read tool): ${input.imagePath}
Shop page title: ${input.pageTitle || "(none)"}

Slots: head = hats, caps, beanies, headbands, headwear. eyewear = glasses, sunglasses. top = t-shirts, shirts, sweaters, hoodies, jackets, coats, dresses. bottom = trousers, jeans, shorts, skirts, leggings. shoes = any footwear (one entry for the pair).

List every clearly visible item that fits a slot, at most 6, in the order head, eyewear, top, bottom, shoes. Layers count separately: an open jacket over a T-shirt is two tops, outer layer first. Leave out bags, jewellery, watches, belts, socks, and anything too hidden or cropped to describe.

For each item:
- slot
- name: 2–5 words a shop would use, e.g. "Orange track jacket".
- brand: only if a logo or the page title shows it, else null.
- description: one short noun phrase for an image model, without articles, in this order: colour, material or texture if obvious, garment type, fit or length if visible, then visible text, logos, prints or trims. Example: "orange lightweight zip-up track jacket with a small white chest logo and black side zips". No opinions, no styling words, no mention of the person or background.

Do not use any tool other than Read.`;

export type ExtractItem = { slot: string; description: string };

export type ExtractionTaskInput = {
  model: TryOnModel;
  skillPath: string;
  photoPath: string;
  photoMediaId: string | null;
  items: ExtractItem[];
  cols: number;
  rows: number;
  aspectRatio: string;
  toolPrefix: string;
};

export const extractionTask = (input: ExtractionTaskInput): string => {
  const t = (name: string): string => `${input.toolPrefix}${name}`;
  const lines = input.items.map((item: ExtractItem, i: number): string => `${i + 1}. ${item.slot}: ${item.description}`);
  return `You turn one photo of a dressed person into product photos through the Higgsfield MCP. Work silently and finish with the structured answer.

Inputs
- Model: ${input.model.id}
- Prompt skill (read it first with Read, follow it exactly): ${input.skillPath}
- Image 1, the person wearing the outfit: ${input.photoPath}${input.photoMediaId ? ` — already uploaded, Higgsfield media id ${input.photoMediaId}` : ""}
- Grid: ${input.cols} column${input.cols > 1 ? "s" : ""} × ${input.rows} row${input.rows > 1 ? "s" : ""}, ${input.cols * input.rows} cells, filled left to right, top to bottom
- Items, in cell order:
${lines.join("\n")}

Steps
1. Read the skill and write the prompt from the grid and the item list.
2. If image 1 has no media id: call ${t("media_upload")} with the file name, PUT the file bytes to the returned upload URL with curl (e.g. curl -sS -X PUT -H "Content-Type: image/jpeg" --data-binary @"<path>" "<upload_url>"), then ${t("media_confirm")}. If an existing media id is rejected, upload image 1 again.
3. Call ${t("generate_image")} once with params: model "${input.model.id}", the prompt, aspect_ratio "${input.aspectRatio}", the model params ${JSON.stringify(input.model.params)}, count 1, use_unlim false, no folder_id, and medias [{ value: <image 1 id>, role: "image_references" }]. Do not create projects or folders. Do not call any other generation tool.
4. Wait for the job with ${t("jobs_wait")} until it finishes, then get the full-resolution result image URL (use ${t("job_display")} or ${t("show_generation_by_ids")} if jobs_wait does not give it).

Answer
- ok: true only if you have the result image URL.
- prompt: the exact prompt you sent.
- personMediaId: the media id used for image 1.
- jobId, resultUrl: from the job.
- error: null, or one sentence saying what failed (credits, moderation, upload…).
If the job ends as "nsfw" or is otherwise blocked by moderation, do not retry: answer ok false with error "Blocked by Higgsfield's safety filter." Retry the generation once only for other failures (timeout, server error). Never ask questions.`;
};

export type BoxesTaskInput = { imagePath: string; items: ExtractItem[]; cols: number; rows: number };

export const boxesTask = (input: BoxesTaskInput): string => `You check a generated product-photo sheet so each item can be cut out.

Image (read it with the Read tool): ${input.imagePath}
It should show ${input.items.length} item${input.items.length > 1 ? "s" : ""} on white, in a grid of ${input.cols} column${input.cols > 1 ? "s" : ""} × ${input.rows} row${input.rows > 1 ? "s" : ""}, filled left to right, top to bottom:
${input.items.map((item: ExtractItem, i: number): string => `${i + 1}. ${item.slot}: ${item.description}`).join("\n")}

For each item, in this order, give the box around it as fractions of the image size: left and top of the box's corner, then width and height, all between 0 and 1. Make each box enclose the whole item with a small white margin and nothing of any other item. If an item is missing from the image, give null for it.

Answer with boxes: one entry per item, ${input.items.length} in total. Do not use any tool other than Read.`;
