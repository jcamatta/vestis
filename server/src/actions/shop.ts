import type { Deps } from "../data/deps.js";
import type { Extraction, ShopOffer, ShoppingItem } from "../data/extraction.js";
import { findById } from "../pure/list.js";
import { lensItem, markSearching, updateShopping } from "../pure/shopping.js";
import { patchExtraction } from "../pure/wardrobe.js";

/** How long the extension has to open the Lens tabs and send back what it read. */
const WAIT_MS = 3 * 60_000;

const NO_ANSWER = "No answer from the Chrome extension. Is it installed and reloaded?";

/** One timer per outfit; a new search restarts it. */
const timers = new Map<string, NodeJS.Timeout>();

/** Items still searching when the wait runs out fail; the others keep their results. */
const giveUp = async (input: { deps: Deps; id: string }): Promise<void> => {
  timers.delete(input.id);
  await input.deps.commit((w) => {
    const e = findById({ list: w.extractions, id: input.id });
    if (!e?.shopping) return w;
    const shopping = updateShopping({
      shopping: e.shopping,
      update: (item: ShoppingItem): ShoppingItem => (item.status === "searching" ? { ...item, status: "error", summary: NO_ANSWER } : item),
    });
    return patchExtraction({ id: input.id, patch: { shopping } })(w);
  });
};

export type StartSearchInput = { deps: Deps; extraction: Extraction; indexes: number[] };

/** Marks the items as searching until the extension answers or the wait runs out. */
export const startSearch = async (input: StartSearchInput): Promise<void> => {
  const { deps, extraction } = input;
  const shopping = markSearching({ shopping: extraction.shopping, count: extraction.items.length, indexes: input.indexes });
  await deps.commit(patchExtraction({ id: extraction.id, patch: { shopping } }));
  clearTimeout(timers.get(extraction.id));
  timers.set(extraction.id, setTimeout((): void => void giveUp({ deps, id: extraction.id }), WAIT_MS));
};

export type LensResult = { index: number; offers: ShopOffer[]; error: string | null };

export type SaveInput = { deps: Deps; id: string; results: LensResult[] };

/** What the extension read on each Lens page replaces the search of that item, if it is still searching. */
export const saveLensResults = async (input: SaveInput): Promise<void> => {
  const at = new Date().toISOString();
  const saved = await input.deps.commit((w) => {
    const e = findById({ list: w.extractions, id: input.id });
    if (!e?.shopping) return w;
    const shopping = updateShopping({
      shopping: e.shopping,
      update: (item: ShoppingItem, index: number): ShoppingItem => {
        const result = input.results.find((r: LensResult): boolean => r.index === index);
        return result && item.status === "searching" ? lensItem({ offers: result.offers, error: result.error, at }) : item;
      },
    });
    return patchExtraction({ id: input.id, patch: { shopping } })(w);
  });
  const e = findById({ list: saved.extractions, id: input.id });
  if (!e?.shopping?.items.some((item: ShoppingItem): boolean => item.status === "searching")) {
    clearTimeout(timers.get(input.id));
    timers.delete(input.id);
  }
};
