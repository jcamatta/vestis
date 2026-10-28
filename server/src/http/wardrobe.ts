import express from "express";
import type { Express, Request, Response } from "express";
import type { Deps } from "../data/deps.js";
import { MODELS } from "../data/models.js";
import { subscribe } from "../actions/events.js";

export type RegisterInput = { app: Express; deps: Deps };

export const registerWardrobeRoutes = (input: RegisterInput): void => {
  const { app, deps } = input;
  app.get("/api/health", (_req: Request, res: Response): void => {
    res.json({ ok: true, app: "vestis" });
  });
  app.get("/api/wardrobe", async (_req: Request, res: Response): Promise<void> => {
    res.json(await deps.read());
  });
  app.get("/api/models", (_req: Request, res: Response): void => {
    res.json(MODELS.map((m): { id: string; label: string; short: string } => ({ id: m.id, label: m.label, short: m.short })));
  });
  app.get("/api/events", async (_req: Request, res: Response): Promise<void> => {
    subscribe({ response: res, initial: await deps.read() });
  });
  app.use("/api/files", express.static(deps.paths.media, { maxAge: "1h", fallthrough: false }));
};
