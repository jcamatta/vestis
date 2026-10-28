import type { Size } from '../data/selection';

export type FitRectInput = { box: Size; ratio: number };

/** Largest rectangle with the given width/height ratio that fits inside the box. */
export const fitRect = (input: FitRectInput): Size => {
  if (input.box.width <= 0 || input.box.height <= 0 || input.ratio <= 0) return { width: 0, height: 0 };
  const width = Math.min(input.box.width, input.box.height * input.ratio);
  return { width: Math.floor(width), height: Math.floor(width / input.ratio) };
};
