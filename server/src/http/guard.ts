import type { NextFunction, Request, Response } from "express";

const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

/** DNS-rebinding guard: only requests addressed to a local host name are served. */
export const localHostOnly = (req: Request, res: Response, next: NextFunction): void => {
  const host = (req.headers.host ?? "").replace(/:\d+$/, "");
  if (LOCAL_HOSTS.includes(host)) next();
  else res.status(403).json({ error: "Forbidden host" });
};
