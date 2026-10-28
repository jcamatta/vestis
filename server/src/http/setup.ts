import type { Express, Request, Response } from "express";
import type { Setup } from "../data/setup.js";
import { readSetup, recheckSetup } from "../actions/setup.js";

export type RegisterSetupInput = { app: Express };

/** Whether Claude and Higgsfield are ready: GET reads the last check (redone after five minutes), POST checks now. */
export const registerSetupRoutes = (input: RegisterSetupInput): void => {
  const { app } = input;
  app.get("/api/setup", async (_req: Request, res: Response): Promise<void> => {
    res.json((await readSetup()) satisfies Setup);
  });
  app.post("/api/setup/check", async (_req: Request, res: Response): Promise<void> => {
    res.json((await recheckSetup()) satisfies Setup);
  });
};
