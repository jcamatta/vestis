import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import type { ImageFile } from "../data/image-file.js";
import type { Result } from "../data/result.js";
import type { CanvasLayout, Cell } from "../pure/canvas-layout.js";
import type { PixelBox } from "../pure/extract-grid.js";
import { productPadding } from "../pure/extract-grid.js";
import { fail, ok } from "../pure/result.js";

const WHITE = { r: 255, g: 255, b: 255 };
const QUALITY = 92;
const MIN_SIDE = 256;

export type SaveImageInput = { bytes: Buffer; mediaDir: string; file: string; maxPixels: number };

/**
 * Any input format sharp reads (JPEG, PNG, WebP, AVIF, GIF, TIFF…) → JPEG:
 * EXIF orientation applied, transparency flattened on white, scaled down to ≤ maxPixels, never up.
 */
export const saveImage = async (input: SaveImageInput): Promise<Result<ImageFile>> => {
  try {
    const meta = await sharp(input.bytes, { animated: false }).metadata();
    const w0 = meta.autoOrient?.width ?? meta.width ?? 0;
    const h0 = meta.autoOrient?.height ?? meta.height ?? 0;
    if (w0 < MIN_SIDE || h0 < MIN_SIDE) return fail(`Image too small (${w0}×${h0}); pick the large product photo.`);
    const scale = Math.min(1, Math.sqrt(input.maxPixels / (w0 * h0)));
    const { data, info } = await sharp(input.bytes, { animated: false })
      .rotate()
      .flatten({ background: WHITE })
      .resize({ width: Math.round(w0 * scale), height: Math.round(h0 * scale), fit: "inside" })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    const path = join(input.mediaDir, input.file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    return ok({ file: input.file, width: info.width, height: info.height });
  } catch (error) {
    return fail(`Unreadable image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

type FitInput = { path: string; cell: Cell };

const fitIntoCell = async (input: FitInput): Promise<OverlayOptions> => {
  const { data, info } = await sharp(input.path)
    .resize({ width: input.cell.width, height: input.cell.height, fit: "inside" })
    .toBuffer({ resolveWithObject: true });
  return {
    input: data,
    left: input.cell.left + Math.floor((input.cell.width - info.width) / 2),
    top: input.cell.top + Math.floor((input.cell.height - info.height) / 2),
  };
};

export type ComposeCanvasInput = { paths: string[]; layout: CanvasLayout; mediaDir: string; file: string };

/** Puts the garment photos on one white canvas, in order, each centred in its cell. */
export const composeCanvas = async (input: ComposeCanvasInput): Promise<ImageFile> => {
  const overlays = await Promise.all(
    input.paths.map((path: string, i: number): Promise<OverlayOptions> => fitIntoCell({ path, cell: input.layout.cells[i] as Cell })),
  );
  const path = join(input.mediaDir, input.file);
  await mkdir(dirname(path), { recursive: true });
  await sharp({ create: { width: input.layout.width, height: input.layout.height, channels: 3, background: WHITE } })
    .composite(overlays)
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(path);
  return { file: input.file, width: input.layout.width, height: input.layout.height };
};

export type CutItemInput = { sourcePath: string; box: PixelBox; mediaDir: string; file: string; maxPixels: number };

/** Cuts one item out of a product sheet: the box, trimmed to the item on white, then centred in a 4:5 white frame. */
export const cutItem = async (input: CutItemInput): Promise<Result<ImageFile>> => {
  try {
    const region = await sharp(input.sourcePath).extract(input.box).toBuffer();
    const trimmed = await sharp(region)
      .trim({ background: WHITE, threshold: 24 })
      .toBuffer({ resolveWithObject: true })
      .catch(async () => sharp(region).toBuffer({ resolveWithObject: true }));
    const padding = productPadding({ width: trimmed.info.width, height: trimmed.info.height });
    const framed = await sharp(trimmed.data).extend({ ...padding, background: WHITE }).jpeg({ quality: QUALITY }).toBuffer();
    return await saveImage({ bytes: framed, mediaDir: input.mediaDir, file: input.file, maxPixels: input.maxPixels });
  } catch (error) {
    return fail(`Could not cut the item: ${error instanceof Error ? error.message : String(error)}`);
  }
};
