import type { Picks } from '../data/selection';
import type { Slot } from '../data/slot';
import type { Garment, ImageFile, Look, LookItem, ModelOption, Person, Wardrobe } from '../data/wardrobe';

export const fileUrl = (image: ImageFile): string => `/api/files/${image.file}`;

export type NewerInput = { current: Wardrobe | undefined; next: Wardrobe };

/** A slow fetch must not overwrite a newer SSE event. */
export const newerWardrobe = (input: NewerInput): Wardrobe =>
  input.current !== undefined && input.current.updatedAt > input.next.updatedAt ? input.current : input.next;

export type SlotGarmentsInput = { garments: Garment[]; slot: Slot };

export const slotGarments = (input: SlotGarmentsInput): Garment[] => input.garments.filter((g: Garment): boolean => g.slot === input.slot);

/** Garments still being sorted by Claude. */
export const unsortedGarments = (garments: Garment[]): Garment[] => garments.filter((g: Garment): boolean => g.slot === null);

export type FindInput<T> = { list: T[]; id: string | null | undefined };

export const findById = <T extends { id: string }>(input: FindInput<T>): T | undefined =>
  input.id ? input.list.find((item: T): boolean => item.id === input.id) : undefined;

export type PrunePicksInput = { picks: Picks; person: Person | undefined; garments: Garment[] };

/** Drops picks for slots the photo cannot show and for garments that are gone or not ready. */
export const prunePicks = (input: PrunePicksInput): Picks =>
  Object.fromEntries(
    Object.entries(input.picks).filter(([slot, id]: [string, string | undefined]): boolean => {
      const garment = findById({ list: input.garments, id });
      return garment?.status === 'ready' && garment.slot === slot && (input.person?.visibleSlots.includes(slot as Slot) ?? false);
    }),
  );

export type PersonLooksInput = { looks: Look[]; personId: string | null };

/** Newest first, as stored. */
export const personLooks = (input: PersonLooksInput): Look[] => input.looks.filter((l: Look): boolean => l.personId === input.personId);

export const isRunning = (look: Look): boolean => look.status !== 'done' && look.status !== 'error';

/** The live step while generating; older looks without one fall back to the status. */
export const lookStatusLabel = (look: Look): string =>
  look.status === 'generating' && look.step
    ? look.step
    : ({ queued: 'Waiting for the previous look', preparing: 'Preparing images', generating: 'Generating', done: 'Done', error: 'Failed' })[look.status];

export type LookGarmentsInput = { look: Look; garments: Garment[] };

/** Names of the look's garments; removed ones show as "removed garment". */
export const lookGarmentNames = (input: LookGarmentsInput): string[] =>
  input.look.items.map((item): string => {
    const garment = findById({ list: input.garments, id: item.garmentId });
    return `${item.fit ? `${item.fit} ` : ''}${garment?.name ?? 'removed garment'}`;
  });

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export type SameLookInput = { looks: Look[]; personId: string; model: string; items: LookItem[] };

const itemsKey = (items: LookItem[]): string => items.map((i: LookItem): string => `${i.slot}:${i.garmentId}:${i.fit ?? ''}`).sort().join('|');

/** The same outfit on the same photo is already waiting or generating: a second press would spend credits twice. */
export const sameLookRunning = (input: SameLookInput): boolean =>
  input.looks.some(
    (l: Look): boolean => isRunning(l) && l.personId === input.personId && l.model === input.model && itemsKey(l.items) === itemsKey(input.items),
  );

export type ModelNameInput = { models: ModelOption[]; id: string };

/** A look's model by name; an id the server no longer lists shows as itself. */
export const modelName = (input: ModelNameInput): ModelOption =>
  input.models.find((m: ModelOption): boolean => m.id === input.id) ?? { id: input.id, label: input.id, short: input.id };
