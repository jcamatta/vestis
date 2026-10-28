import type { ShopOffer, Shopping, ShoppingItem, ShoppingTotal } from "../data/extraction.js";

type Priced = ShopOffer & { price: number; currency: string };

const priced = (o: ShopOffer): o is Priced => o.price !== null && o.currency !== null;

/** ARS when any offer is in pesos, else the currency most offers use; null when no offer has a price. */
export const totalCurrency = (items: ShoppingItem[]): string | null => {
  const counts = new Map<string, number>();
  items.flatMap((i: ShoppingItem): ShopOffer[] => i.offers).filter(priced).forEach((o: Priced): void => {
    counts.set(o.currency, (counts.get(o.currency) ?? 0) + 1);
  });
  if (counts.has("ARS")) return "ARS";
  const ranked = [...counts.entries()].sort((a: [string, number], b: [string, number]): number => b[1] - a[1]);
  return ranked[0]?.[0] ?? null;
};

/** Per item the lowest and highest price in one currency, summed over the items that have one. No conversion. */
export const shoppingTotal = (items: ShoppingItem[]): ShoppingTotal | null => {
  const currency = totalCurrency(items);
  if (currency === null) return null;
  const ranges = items.flatMap((i: ShoppingItem): [number, number][] => {
    const prices = i.offers.filter(priced).filter((o: Priced): boolean => o.currency === currency).map((o: Priced): number => o.price);
    return prices.length > 0 ? [[Math.min(...prices), Math.max(...prices)]] : [];
  });
  return {
    currency,
    min: ranges.reduce((sum: number, r: [number, number]): number => sum + r[0], 0),
    max: ranges.reduce((sum: number, r: [number, number]): number => sum + r[1], 0),
    priced: ranges.length,
    of: items.length,
  };
};

const httpUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

/** Drops offers without a usable link or seen twice, nulls bad prices, upper-cases currencies. */
export const cleanOffers = (offers: ShopOffer[]): ShopOffer[] =>
  offers
    .filter((o: ShopOffer, i: number, all: ShopOffer[]): boolean => httpUrl(o.url) && all.findIndex((x: ShopOffer): boolean => x.url === o.url) === i)
    .map((o: ShopOffer): ShopOffer => {
      const ok = o.price !== null && Number.isFinite(o.price) && o.price >= 0 && !!o.currency?.trim();
      return { ...o, price: ok ? o.price : null, currency: ok ? (o.currency as string).trim().toUpperCase() : null };
    });

/** Kept per item. */
const KEPT = 5;

export type LensItemInput = { offers: ShopOffer[]; error: string | null; at: string };

/** One item's finished search: the best offers and a line saying what happened. */
export const lensItem = (input: LensItemInput): ShoppingItem => {
  if (input.error) return { status: "error", summary: `Lens results could not be read: ${input.error}`, offers: [], searchedAt: input.at };
  const found = cleanOffers(input.offers);
  const summary = found.length === 0 ? "Lens found no products." : `Lens found ${found.length} product${found.length === 1 ? "" : "s"}.`;
  return { status: "done", summary, offers: found.slice(0, KEPT), searchedAt: input.at };
};

const NOT_SEARCHED: ShoppingItem = { status: "none", summary: "", offers: [], searchedAt: null };

type OldShopping = { searchedAt?: string | null; items?: { summary?: string; offers?: ShopOffer[]; status?: string }[] };

export type NormalizeShoppingInput = { shopping: unknown; count: number };

/** One entry per item; results saved before items were searched one by one become finished searches. */
export const normalizeShopping = (input: NormalizeShoppingInput): Shopping | null => {
  if (!input.shopping) return null;
  const old = input.shopping as OldShopping;
  const items = Array.from({ length: input.count }, (_: unknown, i: number): ShoppingItem => {
    const item = old.items?.[i];
    if (!item) return NOT_SEARCHED;
    if (item.status) return item as ShoppingItem;
    return { status: "done", summary: item.summary ?? "", offers: item.offers ?? [], searchedAt: old.searchedAt ?? null };
  });
  return { items, total: shoppingTotal(items) };
};

export type MarkSearchingInput = { shopping: Shopping | null; count: number; indexes: number[] };

/** The given items start searching; their earlier offers stay visible until the new ones arrive. */
export const markSearching = (input: MarkSearchingInput): Shopping => {
  const items = Array.from({ length: input.count }, (_: unknown, i: number): ShoppingItem => {
    const item = input.shopping?.items[i] ?? NOT_SEARCHED;
    return input.indexes.includes(i) ? { ...item, status: "searching", summary: "" } : item;
  });
  return { items, total: shoppingTotal(items) };
};

export type ShoppingUpdate = (item: ShoppingItem, index: number) => ShoppingItem;

export type UpdateShoppingInput = { shopping: Shopping; update: ShoppingUpdate };

export const updateShopping = (input: UpdateShoppingInput): Shopping => {
  const items = input.shopping.items.map(input.update);
  return { items, total: shoppingTotal(items) };
};
