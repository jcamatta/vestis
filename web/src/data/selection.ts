import type { Fit, Slot } from './slot';

/** Chosen garment id per slot. */
export type Picks = Partial<Record<Slot, string>>;

/** Chosen fit per slot; absent = as shown in the product photo. */
export type Fits = Partial<Record<Slot, Fit>>;

export type ViewTab = 'tryon' | 'extract' | 'looks';

export type Size = { width: number; height: number };

export type Status = 'loading' | 'ready' | 'error';

/** One side of a split view. */
export type CompareSide = { url: string; label: string };
