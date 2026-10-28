import { join } from "node:path";
import type { Deps } from "../data/deps.js";
import type { Box, Extraction, ExtractionItem } from "../data/extraction.js";
import type { Garment } from "../data/garment.js";
import type { ImageFile } from "../data/image-file.js";
import { EXTRACT_MODEL } from "../data/models.js";
import { boxesAnswerSchema, generationAnswerSchema, outfitAnswerSchema } from "../data/schemas.js";
import { SLOTS } from "../data/slot.js";
import { generationStep } from "../pure/claude-stream.js";
import { cropBoxes, extractGrid, toPixels } from "../pure/extract-grid.js";
import type { ExtractGrid } from "../pure/extract-grid.js";
import { findById } from "../pure/list.js";
import { boxesSchema, boxesTask, extractionTask, generationSchema, outfitSchema, outfitTask } from "../pure/tasks.js";
import type { ExtractItem } from "../pure/tasks.js";
import { finishExtraction, patchExtraction } from "../pure/wardrobe.js";
import { runClaude } from "./claude.js";
import { download } from "./download.js";
import { newId } from "./id.js";
import { cutItem, saveImage } from "./image.js";
import { analysisQueue, generationQueue, HF_TOOL_PREFIX, HF_TOOLS } from "./queues.js";

const GARMENT_MAX_PIXELS = 2_000_000;

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

type SetInput = { deps: Deps; id: string; patch: Partial<Extraction> };

const setExtraction = async (input: SetInput): Promise<void> => {
  await input.deps.commit(patchExtraction({ id: input.id, patch: input.patch }));
};

const failExtraction = async (input: { deps: Deps; id: string; error: string }): Promise<void> =>
  setExtraction({ deps: input.deps, id: input.id, patch: { status: "error", step: null, error: input.error, finishedAt: new Date().toISOString() } });

const slotOrder = (item: { slot: string }): number => SLOTS.indexOf(item.slot as (typeof SLOTS)[number]);

export type AnalyzeOutfitInput = { deps: Deps; extraction: Extraction };

/** Claude lists the items worn (free); all are ticked by default. */
export const analyzeOutfit = (input: AnalyzeOutfitInput): void =>
  analysisQueue(async (): Promise<void> => {
    const { deps, extraction } = input;
    const result = await runClaude({
      cwd: deps.paths.media,
      run: {
        prompt: outfitTask({ imagePath: join(deps.paths.media, extraction.image.file), pageTitle: extraction.source?.pageTitle ?? "" }),
        schema: outfitSchema,
        tools: ["Read"],
        dirs: [],
        timeoutMs: 180_000,
      },
    });
    const answer = result.ok ? outfitAnswerSchema.safeParse(result.value) : null;
    if (!answer?.success) {
      await failExtraction({ deps, id: extraction.id, error: result.ok ? "Claude gave an unexpected answer." : result.error });
      return;
    }
    const items = [...answer.data.items]
      .sort((a, b): number => slotOrder(a) - slotOrder(b))
      .map((item): ExtractionItem => ({ ...item, selected: true, garmentId: null }));
    if (items.length === 0) {
      await failExtraction({ deps, id: extraction.id, error: "Claude found no clothing in this photo." });
      return;
    }
    await setExtraction({ deps, id: extraction.id, patch: { status: "ready", items, error: null, finishedAt: null } });
  });

const toExtractItem = (item: ExtractionItem): ExtractItem => ({ slot: item.slot, description: item.description });

type FindBoxesInput = { deps: Deps; result: ImageFile; items: ExtractItem[]; grid: ExtractGrid };

/** Claude reads the generated sheet (free) and says where each item landed; null when it cannot answer. */
const findBoxes = async (input: FindBoxesInput): Promise<(Box | null)[] | null> => {
  const result = await runClaude({
    cwd: input.deps.paths.media,
    run: {
      prompt: boxesTask({ imagePath: join(input.deps.paths.media, input.result.file), items: input.items, cols: input.grid.cols, rows: input.grid.rows }),
      schema: boxesSchema,
      tools: ["Read"],
      dirs: [],
      timeoutMs: 180_000,
    },
  });
  const answer = result.ok ? boxesAnswerSchema.safeParse(result.value) : null;
  return answer?.success && answer.data.boxes.length === input.items.length ? answer.data.boxes : null;
};

type CutAllInput = { deps: Deps; extraction: Extraction; picked: ExtractionItem[]; result: ImageFile; boxes: Box[] };

/** One garment per picked item, cut from the sheet, in the same order; null where an item could not be cut. */
const cutAll = async (input: CutAllInput): Promise<(Garment | null)[]> => {
  const { deps, extraction } = input;
  const garments: (Garment | null)[] = [];
  for (const [i, item] of input.picked.entries()) {
    const id = newId("garment");
    const image = await cutItem({
      sourcePath: join(deps.paths.media, input.result.file),
      box: toPixels({ box: input.boxes[i] as Box, width: input.result.width, height: input.result.height }),
      mediaDir: deps.paths.media,
      file: `garments/${id}.jpg`,
      maxPixels: GARMENT_MAX_PIXELS,
    });
    if (!image.ok) {
      console.error(`Extraction ${extraction.id}, item ${i + 1}: ${image.error}`);
      garments.push(null);
      continue;
    }
    garments.push({
      id,
      slot: item.slot,
      name: item.name,
      brand: item.brand,
      description: item.description,
      image: image.value,
      source: { pageUrl: extraction.source?.pageUrl ?? "", pageTitle: extraction.source?.pageTitle ?? extraction.name, imageUrl: "", site: "extracted", extractionId: extraction.id },
      status: "ready",
      error: null,
      createdAt: new Date().toISOString(),
    });
  }
  return garments;
};

const extract = async (input: { deps: Deps; id: string }): Promise<void> => {
  const { deps, id } = input;
  const extraction = findById({ list: (await deps.read()).extractions, id });
  if (!extraction) return;
  const picked = extraction.items.filter((item: ExtractionItem): boolean => item.selected);
  if (picked.length === 0) return failExtraction({ deps, id, error: "No items ticked." });
  const items = picked.map(toExtractItem);
  const grid = extractGrid(picked.length);
  const model = EXTRACT_MODEL;

  await setExtraction({ deps, id, patch: { status: "extracting", step: "Starting Claude", error: null } });
  let step = "Starting Claude";
  const onTool = (tool: string): void => {
    const next = generationStep({ tool, prefix: HF_TOOL_PREFIX, current: step });
    if (next === null) return;
    step = next;
    void setExtraction({ deps, id, patch: { step: next } });
  };
  const result = await runClaude({
    cwd: deps.paths.media,
    onTool,
    run: {
      prompt: extractionTask({
        model,
        skillPath: join(deps.paths.skills, model.skill),
        photoPath: join(deps.paths.media, extraction.image.file),
        photoMediaId: extraction.higgsfieldMediaId,
        items,
        cols: grid.cols,
        rows: grid.rows,
        aspectRatio: grid.aspectRatio,
        toolPrefix: HF_TOOL_PREFIX,
      }),
      schema: generationSchema,
      tools: ["Read", "Bash(curl *)", ...HF_TOOLS],
      dirs: [deps.paths.skills],
      timeoutMs: 15 * 60_000,
    },
  });
  if (!result.ok) return failExtraction({ deps, id, error: result.error });
  const parsed = generationAnswerSchema.safeParse(result.value);
  if (!parsed.success) return failExtraction({ deps, id, error: "Claude gave an unexpected answer." });
  const answer = parsed.data;
  await setExtraction({ deps, id, patch: { prompt: answer.prompt || null, jobId: answer.jobId, higgsfieldMediaId: answer.personMediaId ?? extraction.higgsfieldMediaId } });
  if (!answer.ok || !answer.resultUrl) return failExtraction({ deps, id, error: answer.error ?? "No result image." });

  await setExtraction({ deps, id, patch: { step: "Downloading the result" } });
  const bytes = await download({ url: answer.resultUrl, referer: "" });
  if (!bytes.ok) return failExtraction({ deps, id, error: bytes.error });
  const saved = await saveImage({ bytes: bytes.value, mediaDir: deps.paths.media, file: `extractions/${id}.jpg`, maxPixels: 16_000_000 });
  if (!saved.ok) return failExtraction({ deps, id, error: saved.error });

  await setExtraction({ deps, id, patch: { step: "Finding the items", result: saved.value } });
  const found = await findBoxes({ deps, result: saved.value, items, grid });
  await setExtraction({ deps, id, patch: { step: "Cutting out the items" } });
  const boxes = cropBoxes({ grid, count: picked.length, found });
  const cut = await cutAll({ deps, extraction, picked, result: saved.value, boxes });
  const garments = cut.filter((g: Garment | null): g is Garment => g !== null);

  const garmentIds = extraction.items.map((item: ExtractionItem): string | null => cut[picked.indexOf(item)]?.id ?? null);
  const missing = picked.length - garments.length;
  await deps.commit(
    finishExtraction({
      id,
      garments,
      garmentIds,
      patch: { status: "done", step: null, error: missing > 0 ? `${missing} item${missing > 1 ? "s" : ""} could not be cut out.` : null, finishedAt: new Date().toISOString() },
    }),
  );
};

export type RunExtractionInput = { deps: Deps; id: string };

/** Queued with the looks: one Higgsfield job at a time. */
export const runExtraction = (input: RunExtractionInput): void =>
  generationQueue(async (): Promise<void> => {
    try {
      await extract(input);
    } catch (error) {
      await failExtraction({ deps: input.deps, id: input.id, error: message(error) });
    }
  });
