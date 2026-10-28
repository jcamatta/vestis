import type { Extraction, ExtractionItem, ShopOffer, ShoppingItem, ShoppingTotal } from '../data/wardrobe';
import { extractionRunning } from './extraction';

const NUMBER = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

export type MoneyInput = { amount: number; currency: string };

/** Argentine grouping: "ARS 189.999". */
export const money = (input: MoneyInput): string => `${input.currency} ${NUMBER.format(input.amount)}`;

export const offerPrice = (offer: ShopOffer): string =>
  offer.price !== null && offer.currency !== null ? money({ amount: offer.price, currency: offer.currency }) : 'no price';

const day = (iso: string): string => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** "≈ ARS 420.000–510.000 · 3 of 4 items". */
export const totalLabel = (total: ShoppingTotal): string => {
  const range =
    total.min === total.max ? `≈ ${money({ amount: total.min, currency: total.currency })}` : `≈ ${total.currency} ${NUMBER.format(total.min)}–${NUMBER.format(total.max)}`;
  return `${range} · ${total.priced} of ${total.of} items`;
};

export const shopItem = (input: { extraction: Extraction; index: number }): ShoppingItem | undefined => input.extraction.shopping?.items[input.index];

export const anySearching = (e: Extraction): boolean => (e.shopping?.items ?? []).some((i: ShoppingItem): boolean => i.status === 'searching');

/** Lens searches the cut-outs: once extracted, and not while generating. */
export const canSearchItem = (input: { extraction: Extraction; index: number }): boolean =>
  !extractionRunning(input.extraction) &&
  input.extraction.items[input.index]?.garmentId != null &&
  shopItem(input)?.status !== 'searching';

/** "Search all" when at least one extracted item is not already searching. */
export const canSearchAll = (e: Extraction): boolean => e.items.some((_: ExtractionItem, index: number): boolean => canSearchItem({ extraction: e, index }));

/** "searched 2 Oct". */
export const searchedLabel = (iso: string): string => `searched ${day(iso)}`;
