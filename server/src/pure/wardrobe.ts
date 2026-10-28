import type { Extraction, ExtractionItem, Shopping, ShoppingItem } from "../data/extraction.js";
import type { Garment } from "../data/garment.js";
import type { Look } from "../data/look.js";
import type { Person } from "../data/person.js";
import type { Wardrobe, WardrobeUpdate } from "../data/wardrobe.js";
import { SLOTS } from "../data/slot.js";
import type { Slot } from "../data/slot.js";
import { removeById, updateById } from "./list.js";
import { normalizeShopping, updateShopping } from "./shopping.js";

export const emptyWardrobe = (updatedAt: string): Wardrobe => ({ version: 3, updatedAt, people: [], garments: [], looks: [], extractions: [] });

/** Version 1 had glasses inside head: a photo that showed the head also shows the face. */
const addEyewear = (person: Person): Person =>
  person.visibleSlots.includes("head") && !person.visibleSlots.includes("eyewear")
    ? { ...person, visibleSlots: SLOTS.filter((s: Slot): boolean => s === "eyewear" || person.visibleSlots.includes(s)) }
    : person;

/** Tolerates missing lists in older or hand-edited files, and upgrades version 1 (eyewear) and 2 (no extractions). */
export const normalizeWardrobe = (raw: unknown): Wardrobe => {
  const value = (raw ?? {}) as Partial<Omit<Wardrobe, "version">> & { version?: number };
  const people = value.people ?? [];
  return {
    version: 3,
    updatedAt: value.updatedAt ?? new Date().toISOString(),
    people: value.version === 1 ? people.map(addEyewear) : people,
    garments: value.garments ?? [],
    looks: value.looks ?? [],
    extractions: (value.extractions ?? []).map((e: Extraction): Extraction => ({ ...e, shopping: normalizeShopping({ shopping: e.shopping, count: e.items.length }) })),
  };
};

export const addPerson = (person: Person): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({ ...w, people: [...w.people, person] });
export const addGarment = (garment: Garment): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({ ...w, garments: [garment, ...w.garments] });
export const addLook = (look: Look): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({ ...w, looks: [look, ...w.looks] });
export const addExtraction = (extraction: Extraction): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({ ...w, extractions: [extraction, ...w.extractions] });

export type PatchInput<T> = { id: string; patch: Partial<T> };

export const patchPerson = (input: PatchInput<Person>): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({
  ...w,
  people: updateById({ list: w.people, id: input.id, patch: (p: Person): Person => ({ ...p, ...input.patch }) }),
});

export const patchGarment = (input: PatchInput<Garment>): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({
  ...w,
  garments: updateById({ list: w.garments, id: input.id, patch: (g: Garment): Garment => ({ ...g, ...input.patch }) }),
});

export const patchLook = (input: PatchInput<Look>): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({
  ...w,
  looks: updateById({ list: w.looks, id: input.id, patch: (l: Look): Look => ({ ...l, ...input.patch }) }),
});

export const patchExtraction = (input: PatchInput<Extraction>): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({
  ...w,
  extractions: updateById({ list: w.extractions, id: input.id, patch: (e: Extraction): Extraction => ({ ...e, ...input.patch }) }),
});

export type SelectItemsInput = { id: string; selected: number[] };

/** Ticks exactly the given items. */
export const selectItems = (input: SelectItemsInput): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({
  ...w,
  extractions: updateById({
    list: w.extractions,
    id: input.id,
    patch: (e: Extraction): Extraction => ({ ...e, items: e.items.map((item: ExtractionItem, i: number): ExtractionItem => ({ ...item, selected: input.selected.includes(i) })) }),
  }),
});

export type FinishExtractionInput = { id: string; garments: Garment[]; garmentIds: (string | null)[]; patch: Partial<Extraction> };

/** Adds the cut garments and links each to its item, in one write. */
export const finishExtraction = (input: FinishExtractionInput): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({
  ...w,
  garments: [...input.garments, ...w.garments],
  extractions: updateById({
    list: w.extractions,
    id: input.id,
    patch: (e: Extraction): Extraction => ({
      ...e,
      ...input.patch,
      items: e.items.map((item: ExtractionItem, i: number): ExtractionItem => ({ ...item, garmentId: input.garmentIds[i] ?? item.garmentId })),
    }),
  }),
});

/** Its garments stay in the wardrobe. */
export const removeExtraction = (id: string): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({ ...w, extractions: removeById({ list: w.extractions, id }) });

/** Removing a photo also removes its looks. */
export const removePerson = (id: string): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({
  ...w,
  people: removeById({ list: w.people, id }),
  looks: w.looks.filter((l: Look): boolean => l.personId !== id),
});

/** Looks that used the garment are kept: their result image stays valid. */
export const removeGarment = (id: string): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({ ...w, garments: removeById({ list: w.garments, id }) });

export const removeLook = (id: string): WardrobeUpdate => (w: Wardrobe): Wardrobe => ({ ...w, looks: removeById({ list: w.looks, id }) });

const INTERRUPTED = "Interrupted: the server restarted.";

/** Work that was running when the server stopped can never finish. */
const interruptShopping = (s: Shopping | null): Shopping | null =>
  s && updateShopping({ shopping: s, update: (item: ShoppingItem): ShoppingItem => (item.status === "searching" ? { ...item, status: "error", summary: INTERRUPTED } : item) });

const interruptExtraction = (e: Extraction): Extraction => ({
  ...(e.status === "ready" || e.status === "done" || e.status === "error" ? e : { ...e, status: "error", step: null, error: INTERRUPTED, finishedAt: new Date().toISOString() }),
  shopping: interruptShopping(e.shopping),
});

export const failInterrupted = (w: Wardrobe): Wardrobe => ({
  ...w,
  looks: w.looks.map((l: Look): Look =>
    l.status === "done" || l.status === "error" ? l : { ...l, status: "error", step: null, error: INTERRUPTED, finishedAt: new Date().toISOString() },
  ),
  garments: w.garments.map((g: Garment): Garment => (g.status === "analyzing" ? { ...g, status: "error", error: INTERRUPTED } : g)),
  people: w.people.map((p: Person): Person => (p.status === "analyzing" ? { ...p, status: "error", error: INTERRUPTED } : p)),
  extractions: w.extractions.map(interruptExtraction),
});
