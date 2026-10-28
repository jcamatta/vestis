import type { Response } from "express";
import type { Wardrobe } from "../data/wardrobe.js";

const KEEP_ALIVE_MS = 25_000;

const clients = new Set<Response>();

type SendInput = { response: Response; wardrobe: Wardrobe };

const send = (input: SendInput): void => {
  input.response.write(`event: wardrobe\ndata: ${JSON.stringify(input.wardrobe)}\n\n`);
};

export type SubscribeInput = { response: Response; initial: Wardrobe };

/** Opens an SSE stream, sends the current wardrobe, keeps it until the client leaves. */
export const subscribe = (input: SubscribeInput): void => {
  const { response } = input;
  response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
  response.write("retry: 2000\n\n");
  send({ response, wardrobe: input.initial });
  clients.add(response);
  const keepAlive = setInterval((): void => {
    response.write(": keep-alive\n\n");
  }, KEEP_ALIVE_MS);
  response.on("close", (): void => {
    clearInterval(keepAlive);
    clients.delete(response);
  });
};

export const broadcast = (wardrobe: Wardrobe): void => {
  clients.forEach((response: Response): void => send({ response, wardrobe }));
};
