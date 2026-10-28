import type { Garment } from "../data/garment.js";
import type { LookItem } from "../data/look.js";
import { MODELS } from "../data/models.js";
import type { Person } from "../data/person.js";
import type { Result } from "../data/result.js";
import { SLOTS } from "../data/slot.js";
import type { Wardrobe } from "../data/wardrobe.js";
import { findById } from "./list.js";
import { fail, ok } from "./result.js";

export type LookRequest = { personId: string; items: LookItem[]; model: string };

export type CheckedLook = { person: Person; items: LookItem[]; garments: Garment[] };

const slotOrder = (item: LookItem): number => SLOTS.indexOf(item.slot);

export type CheckLookInput = { wardrobe: Wardrobe; request: LookRequest };

/** Validates a try-on request against the wardrobe and orders the items head → shoes. */
export const checkLook = (input: CheckLookInput): Result<CheckedLook> => {
  const { wardrobe, request } = input;
  const person = findById({ list: wardrobe.people, id: request.personId });
  if (!person) return fail("Unknown photo.");
  if (person.status !== "ready") return fail("The photo is still being analysed.");
  if (!MODELS.some((m): boolean => m.id === request.model)) return fail(`Unknown model: ${request.model}`);
  if (request.items.length === 0) return fail("Pick at least one garment.");
  const slots = request.items.map((i: LookItem): string => i.slot);
  if (new Set(slots).size !== slots.length) return fail("One garment per section.");
  const items = [...request.items].sort((a: LookItem, b: LookItem): number => slotOrder(a) - slotOrder(b));
  const garments: Garment[] = [];
  for (const item of items) {
    if (!person.visibleSlots.includes(item.slot)) return fail(`${item.slot} is not visible in this photo.`);
    const garment = findById({ list: wardrobe.garments, id: item.garmentId });
    if (!garment) return fail("A garment was removed.");
    if (garment.status !== "ready" || garment.slot !== item.slot) return fail(`${garment.name || "A garment"} is not ready for ${item.slot}.`);
    garments.push(garment);
  }
  return ok({ person, items, garments });
};

const itemsKey = (items: LookItem[]): string => items.map((i: LookItem): string => `${i.slot}:${i.garmentId}:${i.fit ?? ""}`).sort().join("|");

export type DuplicateInput = { wardrobe: Wardrobe; request: LookRequest };

/** The same outfit on the same photo is already waiting or generating. */
export const duplicateRunning = (input: DuplicateInput): boolean =>
  input.wardrobe.looks.some(
    (l): boolean =>
      l.status !== "done" && l.status !== "error" && l.personId === input.request.personId && l.model === input.request.model && itemsKey(l.items) === itemsKey(input.request.items),
  );
