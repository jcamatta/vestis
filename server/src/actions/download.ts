import type { Result } from "../data/result.js";
import { fail, ok } from "../pure/result.js";

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const MAX_BYTES = 40 * 1024 * 1024;

export type DownloadInput = { url: string; referer: string };

/** Fetches an image with browser-like headers; some shop CDNs refuse requests without them. */
export const download = async (input: DownloadInput): Promise<Result<Buffer>> => {
  try {
    const response = await fetch(input.url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "image/avif,image/webp,image/png,image/jpeg,*/*", ...(input.referer ? { Referer: input.referer } : {}) },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) return fail(`Download failed: ${response.status} ${response.statusText}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES) return fail("Image larger than 40 MB.");
    return ok(bytes);
  } catch (error) {
    return fail(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
