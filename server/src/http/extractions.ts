import express from "express";
import type { Request, Response } from "express";
import type { Extraction, ExtractionItem } from "../data/extraction.js";
import { EXTRACT_MODEL } from "../data/models.js";
import { extractionPatchSchema, extractionRequestSchema, lensResultsSchema, shopRequestSchema } from "../data/schemas.js";
import { download } from "../actions/download.js";
import { analyzeOutfit, runExtraction } from "../actions/extract.js";
import { removeFiles } from "../actions/files.js";
import { saveLensResults, startSearch } from "../actions/shop.js";
import { newId } from "../actions/id.js";
import { saveImage } from "../actions/image.js";
import { findById } from "../pure/list.js";
import { siteFromUrl } from "../pure/site.js";
import { addExtraction, patchExtraction, removeExtraction, selectItems } from "../pure/wardrobe.js";
import type { RegisterInput } from "./wardrobe.js";

const OUTFIT_MAX_PIXELS = 4_000_000;

type Incoming = { bytes: Buffer; name: string; source: Extraction["source"] };

/** Raw image bytes from the web app (`?name=`), or the extension's JSON with base64 bytes or a URL. */
const incoming = async (req: Request): Promise<Incoming | { error: string }> => {
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length === 0) return { error: "Send an image." };
    return { bytes: req.body, name: typeof req.query.name === "string" ? req.query.name.slice(0, 60) : "Outfit", source: null };
  }
  const body = extractionRequestSchema.safeParse(req.body);
  if (!body.success) return { error: "Bad request" };
  const r = body.data;
  const bytes = r.imageBase64 ? { ok: true as const, value: Buffer.from(r.imageBase64, "base64") } : await download({ url: r.imageUrl, referer: r.pageUrl });
  if (!bytes.ok) return { error: bytes.error };
  return {
    bytes: bytes.value,
    name: r.pageTitle.slice(0, 60) || "Outfit",
    source: { pageUrl: r.pageUrl, pageTitle: r.pageTitle, imageUrl: r.imageUrl, site: siteFromUrl(r.pageUrl || r.imageUrl) },
  };
};

const running = (e: Extraction): boolean => e.status === "analyzing" || e.status === "queued" || e.status === "extracting";

export const registerExtractionRoutes = (input: RegisterInput): void => {
  const { app, deps } = input;

  app.post(
    "/api/extractions",
    express.raw({ type: "image/*", limit: "60mb" }),
    express.json({ limit: "60mb" }),
    async (req: Request, res: Response): Promise<void> => {
      const got = await incoming(req);
      if ("error" in got) {
        res.status(got.error === "Bad request" ? 400 : 422).json({ error: got.error });
        return;
      }
      const id = newId("extraction");
      const image = await saveImage({ bytes: got.bytes, mediaDir: deps.paths.media, file: `outfits/${id}.jpg`, maxPixels: OUTFIT_MAX_PIXELS });
      if (!image.ok) {
        res.status(422).json({ error: image.error });
        return;
      }
      const extraction: Extraction = {
        id,
        name: got.name,
        image: image.value,
        source: got.source,
        status: "analyzing",
        step: null,
        error: null,
        items: [],
        model: EXTRACT_MODEL.id,
        prompt: null,
        higgsfieldMediaId: null,
        jobId: null,
        result: null,
        createdAt: new Date().toISOString(),
        finishedAt: null,
        shopping: null,
      };
      await deps.commit(addExtraction(extraction));
      analyzeOutfit({ deps, extraction });
      res.status(201).json(extraction);
    },
  );

  /** Tick or untick items, only before extracting. */
  app.patch("/api/extractions/:id", express.json(), async (req: Request, res: Response): Promise<void> => {
    const body = extractionPatchSchema.safeParse(req.body);
    const extraction = findById({ list: (await deps.read()).extractions, id: String(req.params.id) });
    if (!body.success || !extraction) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    if (extraction.status !== "ready" && extraction.status !== "error") {
      res.status(409).json({ error: "The items can only be changed before extracting." });
      return;
    }
    res.json(await deps.commit(selectItems({ id: extraction.id, selected: body.data.selected })));
  });

  /** Spends credits: one generation for all ticked items. */
  app.post("/api/extractions/:id/run", async (req: Request, res: Response): Promise<void> => {
    const extraction = findById({ list: (await deps.read()).extractions, id: String(req.params.id) });
    if (!extraction) {
      res.status(404).json({ error: "Unknown outfit" });
      return;
    }
    if (running(extraction)) {
      res.status(409).json({ error: extraction.status === "analyzing" ? "Claude is still reading the photo." : "This outfit is already being extracted." });
      return;
    }
    if (!extraction.items.some((item): boolean => item.selected)) {
      res.status(422).json({ error: "Tick at least one item." });
      return;
    }
    await deps.commit(patchExtraction({ id: extraction.id, patch: { status: "queued", step: null, error: null, finishedAt: null } }));
    runExtraction({ deps, id: extraction.id });
    res.status(202).json({ ok: true });
  });

  /** Reads the photo again (free), when the first read failed. */
  app.post("/api/extractions/:id/retry", async (req: Request, res: Response): Promise<void> => {
    const extraction = findById({ list: (await deps.read()).extractions, id: String(req.params.id) });
    if (!extraction) {
      res.status(404).json({ error: "Unknown outfit" });
      return;
    }
    if (running(extraction) || extraction.shopping?.items.some((item): boolean => item.status === "searching")) {
      res.status(409).json({ error: "Already running." });
      return;
    }
    await deps.commit(patchExtraction({ id: extraction.id, patch: { status: "analyzing", items: [], error: null, shopping: null } }));
    analyzeOutfit({ deps, extraction });
    res.status(202).json({ ok: true });
  });

  /** Starts a Lens search of the given items (all extracted ones when none are given); returns their cut-outs for the extension. */
  app.post("/api/extractions/:id/shop", express.json(), async (req: Request, res: Response): Promise<void> => {
    const body = shopRequestSchema.safeParse(req.body ?? {});
    const wardrobe = await deps.read();
    const extraction = findById({ list: wardrobe.extractions, id: String(req.params.id) });
    if (!body.success) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    if (!extraction) {
      res.status(404).json({ error: "Unknown outfit" });
      return;
    }
    if (running(extraction)) {
      res.status(409).json({ error: extraction.status === "analyzing" ? "Claude is still reading the photo." : "Wait for the extraction to finish." });
      return;
    }
    const wanted = body.data.indexes ?? extraction.items.map((_: ExtractionItem, i: number): number => i);
    const items = extraction.items.flatMap((item: ExtractionItem, index: number): { index: number; name: string; imageUrl: string }[] => {
      const garment = item.garmentId ? findById({ list: wardrobe.garments, id: item.garmentId }) : undefined;
      const busy = extraction.shopping?.items[index]?.status === "searching";
      return garment && !busy && wanted.includes(index) ? [{ index, name: item.name, imageUrl: `/api/files/${garment.image.file}` }] : [];
    });
    if (items.length === 0) {
      res.status(422).json({ error: "Nothing to search: Lens searches extracted items that are not already searching." });
      return;
    }
    await startSearch({ deps, extraction, indexes: items.map((i): number => i.index) });
    res.status(202).json({ items });
  });

  /** From the extension: what it read on each Lens page. */
  app.post("/api/extractions/:id/shop-results", express.json({ limit: "2mb" }), async (req: Request, res: Response): Promise<void> => {
    const body = lensResultsSchema.safeParse(req.body);
    const extraction = findById({ list: (await deps.read()).extractions, id: String(req.params.id) });
    if (!body.success || !extraction) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    await saveLensResults({ deps, id: extraction.id, results: body.data.items });
    res.status(204).end();
  });

  /** The garments cut from it stay. */
  app.delete("/api/extractions/:id", async (req: Request, res: Response): Promise<void> => {
    const extraction = findById({ list: (await deps.read()).extractions, id: String(req.params.id) });
    if (!extraction) {
      res.status(404).json({ error: "Unknown outfit" });
      return;
    }
    await deps.commit(removeExtraction(extraction.id));
    await removeFiles({ mediaDir: deps.paths.media, files: [extraction.image.file, extraction.result?.file] });
    res.status(204).end();
  });
};
