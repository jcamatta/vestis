import express from "express";
import type { Request, Response } from "express";
import type { Garment } from "../data/garment.js";
import { garmentPatchSchema, garmentRequestSchema } from "../data/schemas.js";
import { analyzeGarment } from "../actions/jobs.js";
import { download } from "../actions/download.js";
import { removeFiles } from "../actions/files.js";
import { newId } from "../actions/id.js";
import { saveImage } from "../actions/image.js";
import { findById } from "../pure/list.js";
import { siteFromUrl } from "../pure/site.js";
import { addGarment, patchGarment, removeGarment } from "../pure/wardrobe.js";
import type { RegisterInput } from "./wardrobe.js";

const GARMENT_MAX_PIXELS = 2_000_000;

export const registerGarmentRoutes = (input: RegisterInput): void => {
  const { app, deps } = input;

  /** Called by the extension. */
  app.post("/api/garments", express.json({ limit: "60mb" }), async (req: Request, res: Response): Promise<void> => {
    const body = garmentRequestSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    const request = body.data;
    const bytes = request.imageBase64
      ? { ok: true as const, value: Buffer.from(request.imageBase64, "base64") }
      : await download({ url: request.imageUrl, referer: request.pageUrl });
    if (!bytes.ok) {
      res.status(422).json({ error: bytes.error });
      return;
    }
    const id = newId("garment");
    const image = await saveImage({ bytes: bytes.value, mediaDir: deps.paths.media, file: `garments/${id}.jpg`, maxPixels: GARMENT_MAX_PIXELS });
    if (!image.ok) {
      res.status(422).json({ error: image.error });
      return;
    }
    const garment: Garment = {
      id,
      slot: request.slot,
      name: request.pageTitle.slice(0, 60),
      brand: null,
      description: "",
      image: image.value,
      source: { pageUrl: request.pageUrl, pageTitle: request.pageTitle, imageUrl: request.imageUrl, site: siteFromUrl(request.pageUrl || request.imageUrl) },
      status: "analyzing",
      error: null,
      createdAt: new Date().toISOString(),
    };
    await deps.commit(addGarment(garment));
    analyzeGarment({ deps, garment, requestedSlot: request.slot });
    res.status(201).json(garment);
  });

  /** Fix the section or the name by hand. */
  app.patch("/api/garments/:id", express.json(), async (req: Request, res: Response): Promise<void> => {
    const body = garmentPatchSchema.safeParse(req.body);
    const id = String(req.params.id);
    if (!body.success || !findById({ list: (await deps.read()).garments, id })) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    res.json(await deps.commit(patchGarment({ id, patch: body.data })));
  });

  app.post("/api/garments/:id/retry", async (req: Request, res: Response): Promise<void> => {
    const garment = findById({ list: (await deps.read()).garments, id: String(req.params.id) });
    if (!garment) {
      res.status(404).json({ error: "Unknown garment" });
      return;
    }
    await deps.commit(patchGarment({ id: garment.id, patch: { status: "analyzing", error: null } }));
    analyzeGarment({ deps, garment, requestedSlot: garment.slot });
    res.status(202).json({ ok: true });
  });

  app.delete("/api/garments/:id", async (req: Request, res: Response): Promise<void> => {
    const garment = findById({ list: (await deps.read()).garments, id: String(req.params.id) });
    if (!garment) {
      res.status(404).json({ error: "Unknown garment" });
      return;
    }
    await deps.commit(removeGarment(garment.id));
    await removeFiles({ mediaDir: deps.paths.media, files: [garment.image.file] });
    res.status(204).end();
  });
};
