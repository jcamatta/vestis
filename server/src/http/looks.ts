import express from "express";
import type { Request, Response } from "express";
import type { Look } from "../data/look.js";
import { lookRequestSchema } from "../data/schemas.js";
import { removeFiles } from "../actions/files.js";
import { newId } from "../actions/id.js";
import { runLook } from "../actions/jobs.js";
import { findById } from "../pure/list.js";
import { checkLook, duplicateRunning } from "../pure/look.js";
import { addLook, removeLook } from "../pure/wardrobe.js";
import type { RegisterInput } from "./wardrobe.js";

export const registerLookRoutes = (input: RegisterInput): void => {
  const { app, deps } = input;

  app.post("/api/looks", express.json(), async (req: Request, res: Response): Promise<void> => {
    const body = lookRequestSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    const wardrobe = await deps.read();
    if (duplicateRunning({ wardrobe, request: body.data })) {
      res.status(409).json({ error: "This outfit is already being generated." });
      return;
    }
    const checked = checkLook({ wardrobe, request: body.data });
    if (!checked.ok) {
      res.status(422).json({ error: checked.error });
      return;
    }
    const look: Look = {
      id: newId("look"),
      personId: body.data.personId,
      items: checked.value.items,
      model: body.data.model,
      status: "queued",
      step: null,
      prompt: null,
      canvas: null,
      result: null,
      jobId: null,
      error: null,
      createdAt: new Date().toISOString(),
      finishedAt: null,
    };
    await deps.commit(addLook(look));
    runLook({ deps, look });
    res.status(201).json(look);
  });

  app.delete("/api/looks/:id", async (req: Request, res: Response): Promise<void> => {
    const look = findById({ list: (await deps.read()).looks, id: String(req.params.id) });
    if (!look) {
      res.status(404).json({ error: "Unknown look" });
      return;
    }
    await deps.commit(removeLook(look.id));
    await removeFiles({ mediaDir: deps.paths.media, files: [look.result?.file, look.canvas?.file] });
    res.status(204).end();
  });
};
