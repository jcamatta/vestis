import express from "express";
import type { Request, Response } from "express";
import type { Look } from "../data/look.js";
import type { Person } from "../data/person.js";
import { analyzePerson } from "../actions/jobs.js";
import { removeFiles } from "../actions/files.js";
import { newId } from "../actions/id.js";
import { saveImage } from "../actions/image.js";
import { findById } from "../pure/list.js";
import { addPerson, patchPerson, removePerson } from "../pure/wardrobe.js";
import type { RegisterInput } from "./wardrobe.js";

/** FLUX VTO processes inputs up to 4 MP as-is. */
const PERSON_MAX_PIXELS = 4_000_000;

export const registerPeopleRoutes = (input: RegisterInput): void => {
  const { app, deps } = input;

  /** Raw image bytes in the body; `?name=` optional. */
  app.post("/api/people", express.raw({ type: "image/*", limit: "60mb" }), async (req: Request, res: Response): Promise<void> => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Send an image." });
      return;
    }
    const id = newId("person");
    const image = await saveImage({ bytes: req.body, mediaDir: deps.paths.media, file: `people/${id}.jpg`, maxPixels: PERSON_MAX_PIXELS });
    if (!image.ok) {
      res.status(422).json({ error: image.error });
      return;
    }
    const person: Person = {
      id,
      name: typeof req.query.name === "string" ? req.query.name.slice(0, 60) : "Photo",
      image: image.value,
      visibleSlots: [],
      summary: "",
      higgsfieldMediaId: null,
      status: "analyzing",
      error: null,
      createdAt: new Date().toISOString(),
    };
    await deps.commit(addPerson(person));
    analyzePerson({ deps, person });
    res.status(201).json(person);
  });

  app.post("/api/people/:id/retry", async (req: Request, res: Response): Promise<void> => {
    const person = findById({ list: (await deps.read()).people, id: String(req.params.id) });
    if (!person) {
      res.status(404).json({ error: "Unknown photo" });
      return;
    }
    await deps.commit(patchPerson({ id: person.id, patch: { status: "analyzing", error: null } }));
    analyzePerson({ deps, person });
    res.status(202).json({ ok: true });
  });

  app.delete("/api/people/:id", async (req: Request, res: Response): Promise<void> => {
    const wardrobe = await deps.read();
    const person = findById({ list: wardrobe.people, id: String(req.params.id) });
    if (!person) {
      res.status(404).json({ error: "Unknown photo" });
      return;
    }
    const looks = wardrobe.looks.filter((l: Look): boolean => l.personId === person.id);
    await deps.commit(removePerson(person.id));
    await removeFiles({
      mediaDir: deps.paths.media,
      files: [person.image.file, ...looks.flatMap((l: Look): (string | undefined)[] => [l.result?.file, l.canvas?.file])],
    });
    res.status(204).end();
  });
};
