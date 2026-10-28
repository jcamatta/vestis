export const SLOTS = ["head", "eyewear", "top", "bottom", "shoes"] as const;
export type Slot = (typeof SLOTS)[number];

export const TOP_FITS = ["slim", "regular", "oversized"] as const;
export const BOTTOM_FITS = ["slim", "regular", "baggy"] as const;
export type Fit = (typeof TOP_FITS)[number] | (typeof BOTTOM_FITS)[number];
