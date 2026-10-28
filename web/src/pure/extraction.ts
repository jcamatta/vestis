import type { Picks } from '../data/selection';
import type { Extraction, ExtractionItem, Garment } from '../data/wardrobe';
import { findById } from './wardrobe';

/** Reading, waiting or generating: nothing can be changed or started. */
export const extractionRunning = (e: Extraction): boolean => e.status === 'analyzing' || e.status === 'queued' || e.status === 'extracting';

/** Items can be ticked until the extraction has run. */
export const itemsEditable = (e: Extraction): boolean => e.status === 'ready' || (e.status === 'error' && e.items.length > 0 && e.result === null);

export const selectedCount = (e: Extraction): number => e.items.filter((i: ExtractionItem): boolean => i.selected).length;

export const extractionStatusLabel = (e: Extraction): string =>
  e.status === 'extracting' && e.step
    ? e.step
    : ({
        analyzing: 'Reading the outfit',
        ready: 'Ready',
        queued: 'Waiting for the previous job',
        extracting: 'Extracting',
        done: 'Done',
        error: 'Failed',
      })[e.status];

export type ToggleItemInput = { extraction: Extraction; index: number };

/** Indexes ticked after flipping one item. */
export const toggledSelection = (input: ToggleItemInput): number[] =>
  input.extraction.items.flatMap((item: ExtractionItem, i: number): number[] => ((i === input.index ? !item.selected : item.selected) ? [i] : []));

export type ExtractedInput = { extraction: Extraction; garments: Garment[] };

/** The garments cut from this outfit that still exist, in item order. */
export const extractedGarments = (input: ExtractedInput): Garment[] =>
  input.extraction.items.flatMap((item: ExtractionItem): Garment[] => {
    const g = findById({ list: input.garments, id: item.garmentId });
    return g ? [g] : [];
  });

/** One garment per section for Try on: the first of each (e.g. the outer layer when there are two tops). */
export const picksFrom = (garments: Garment[]): Picks =>
  garments.reduce((picks: Picks, g: Garment): Picks => (g.slot === null || picks[g.slot] ? picks : { ...picks, [g.slot]: g.id }), {});
