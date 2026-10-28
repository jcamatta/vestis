import type { AspectRatio } from "../data/model.js";

export type NearestRatioInput = { width: number; height: number; ratios: AspectRatio[] };

/** Closest supported ratio, compared on a log scale so 2:3 and 3:2 are equally far from 1:1. */
export const nearestRatio = (input: NearestRatioInput): string => {
  const target = Math.log(input.width / input.height);
  const distance = (r: AspectRatio): number => Math.abs(Math.log(r.value) - target);
  const best = input.ratios.reduce((a: AspectRatio, b: AspectRatio): AspectRatio => (distance(b) < distance(a) ? b : a));
  return best.label;
};
