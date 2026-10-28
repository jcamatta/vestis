export const SLOTS = ['head', 'eyewear', 'top', 'bottom', 'shoes'] as const;
export type Slot = (typeof SLOTS)[number];

export type Fit = 'slim' | 'regular' | 'oversized' | 'baggy';

export const SLOT_LABELS: Record<Slot, string> = { head: 'Head', eyewear: 'Glasses', top: 'Tops', bottom: 'Pants', shoes: 'Shoes' };

/** Slots with a fit choice, and the choices, as in the BFL demo. */
export const SLOT_FITS: Partial<Record<Slot, Fit[]>> = {
  top: ['slim', 'regular', 'oversized'],
  bottom: ['slim', 'regular', 'baggy'],
};
