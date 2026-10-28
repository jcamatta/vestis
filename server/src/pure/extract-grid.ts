import type { Box } from "../data/extraction.js";

/** `aspectRatio` is one GPT Image 2.5 supports, so the cells come out close to 4:5 product-photo shape. */
export type ExtractGrid = { cols: number; rows: number; aspectRatio: string };

/** 1 → one cell, 2 → side by side, 3–4 → 2×2, 5–6 → 3×2; cells are filled left to right, top to bottom. */
export const extractGrid = (count: number): ExtractGrid => {
  if (count <= 1) return { cols: 1, rows: 1, aspectRatio: "4:5" };
  if (count === 2) return { cols: 2, rows: 1, aspectRatio: "3:2" };
  if (count <= 4) return { cols: 2, rows: 2, aspectRatio: "4:5" };
  return { cols: 3, rows: 2, aspectRatio: "5:4" };
};

export type CellBoxInput = { grid: ExtractGrid; index: number };

/** Where item `index` should be if the model followed the grid. */
export const cellBox = (input: CellBoxInput): Box => ({
  left: (input.index % input.grid.cols) / input.grid.cols,
  top: Math.floor(input.index / input.grid.cols) / input.grid.rows,
  width: 1 / input.grid.cols,
  height: 1 / input.grid.rows,
});

const MIN_SIDE = 0.05;

const inside = (b: Box): boolean =>
  b.left >= 0 && b.top >= 0 && b.width >= MIN_SIDE && b.height >= MIN_SIDE && b.left + b.width <= 1.001 && b.top + b.height <= 1.001;

const overlap = (input: { a: Box; b: Box }): number => {
  const w = Math.min(input.a.left + input.a.width, input.b.left + input.b.width) - Math.max(input.a.left, input.b.left);
  const h = Math.min(input.a.top + input.a.height, input.b.top + input.b.height) - Math.max(input.a.top, input.b.top);
  return w > 0 && h > 0 ? (w * h) / Math.min(input.a.width * input.a.height, input.b.width * input.b.height) : 0;
};

export type CropBoxesInput = { grid: ExtractGrid; count: number; found: (Box | null)[] | null };

/**
 * One crop box per item: Claude's box when it is sane, else the item's grid cell.
 * If two of Claude's boxes cover the same thing (> 30 % of the smaller), its answer is not trusted at all.
 */
export const cropBoxes = (input: CropBoxesInput): Box[] => {
  const cells = Array.from({ length: input.count }, (_: unknown, index: number): Box => cellBox({ grid: input.grid, index }));
  const found = input.found ?? [];
  const candidates = cells.map((cell: Box, i: number): Box => {
    const box = found[i];
    return box && inside(box) ? box : cell;
  });
  const clash = candidates.some((a: Box, i: number): boolean => candidates.slice(i + 1).some((b: Box): boolean => overlap({ a, b }) > 0.3));
  return clash ? cells : candidates;
};

export type ToPixelsInput = { box: Box; width: number; height: number };

export type PixelBox = { left: number; top: number; width: number; height: number };

/** Fractions → whole pixels inside the image. */
export const toPixels = (input: ToPixelsInput): PixelBox => {
  const left = Math.max(0, Math.round(input.box.left * input.width));
  const top = Math.max(0, Math.round(input.box.top * input.height));
  const right = Math.min(input.width, Math.round((input.box.left + input.box.width) * input.width));
  const bottom = Math.min(input.height, Math.round((input.box.top + input.box.height) * input.height));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
};

export type PadInput = { width: number; height: number };

export type Padding = { top: number; bottom: number; left: number; right: number };

const MIN_WIDTH = 320;

/** White margin that centres a trimmed item in a 4:5 frame with ~8 % air around it, at least 320 px wide. */
export const productPadding = (input: PadInput): Padding => {
  const width = Math.max(MIN_WIDTH, Math.ceil(Math.max(input.width, input.height * 0.8) * 1.16));
  const height = Math.ceil(width * 1.25);
  const x = width - input.width;
  const y = height - input.height;
  return { left: Math.floor(x / 2), right: Math.ceil(x / 2), top: Math.floor(y / 2), bottom: Math.ceil(y / 2) };
};
