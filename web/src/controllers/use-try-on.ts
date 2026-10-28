import { useMemo, useState } from 'react';
import { createLook, deleteEntity, moveGarment, retryAnalysis, uploadPerson } from '../actions/api';
import type { EntityRef, MoveGarmentInput } from '../actions/api';
import { pickImages } from '../actions/pick-images';
import type { Fits, Picks } from '../data/selection';
import { SLOTS } from '../data/slot';
import type { Fit, Slot } from '../data/slot';
import type { Garment, Look, LookItem, ModelOption, Person, Wardrobe } from '../data/wardrobe';
import { findById, personLooks, prunePicks, sameLookRunning } from '../pure/wardrobe';

export type TryOnState = {
  people: Person[];
  person: Person | undefined;
  garments: Garment[];
  models: ModelOption[];
  modelId: string;
  picks: Picks;
  fits: Fits;
  looks: Look[];
  shownLook: Look | undefined;
  compareOn: boolean;
  canTryOn: boolean;
  busy: boolean;
  error: string | null;
  selectPerson: (id: string) => void;
  selectModel: (id: string) => void;
  togglePick: (garment: Garment) => void;
  setFit: (input: { slot: Slot; fit: Fit | null }) => void;
  clearPicks: () => void;
  /** Replaces the picks, e.g. with the items cut from an outfit. */
  setPicks: (picks: Picks) => void;
  showLook: (id: string | null) => void;
  setCompareOn: (on: boolean) => void;
  tryOn: () => void;
  addPhotos: () => void;
  dropPhotos: (files: File[]) => void;
  remove: (ref: EntityRef) => void;
  retry: (ref: EntityRef) => void;
  move: (input: MoveGarmentInput) => void;
};

/** `ready`: Claude and Higgsfield can run (see use-setup). */
export type UseTryOnInput = { wardrobe: Wardrobe | undefined; models: ModelOption[]; ready: boolean };

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const useTryOn = (input: UseTryOnInput): TryOnState => {
  const people = input.wardrobe?.people ?? [];
  const garments = input.wardrobe?.garments ?? [];
  const [personId, setPersonId] = useState<string | null>(null);
  const [modelChoice, setModelChoice] = useState<string | null>(null);
  const [rawPicks, setPicks] = useState<Picks>({});
  const [fits, setFits] = useState<Fits>({});
  const [lookId, setLookId] = useState<string | null>(null);
  const [compareOn, setCompareOn] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const person = findById({ list: people, id: personId }) ?? people[0];
  const modelId = modelChoice ?? input.models[0]?.id ?? '';
  const picks = useMemo((): Picks => prunePicks({ picks: rawPicks, person, garments }), [rawPicks, person, garments]);
  const looks = personLooks({ looks: input.wardrobe?.looks ?? [], personId: person?.id ?? null });
  const shownLook = findById({ list: looks, id: lookId });
  const items: LookItem[] = SLOTS.flatMap((slot: Slot): LookItem[] => {
    const garmentId = picks[slot];
    return garmentId ? [{ slot, garmentId, fit: fits[slot] ?? null }] : [];
  });
  const alreadyRunning = person !== undefined && sameLookRunning({ looks: input.wardrobe?.looks ?? [], personId: person.id, model: modelId, items });
  const canTryOn = input.ready && !busy && !alreadyRunning && person?.status === 'ready' && modelId !== '' && items.length > 0;

  const run = (task: () => Promise<void>): void => {
    setError(null);
    task().catch((e: unknown): void => setError(errorText(e)));
  };

  const upload = (files: File[]): void =>
    run(async (): Promise<void> => {
      for (const file of files) {
        const added = await uploadPerson(file);
        setPersonId(added.id);
        setLookId(null);
      }
    });

  return {
    people,
    person,
    garments,
    models: input.models,
    modelId,
    picks,
    fits,
    looks,
    shownLook,
    compareOn,
    canTryOn,
    busy,
    error,
    selectPerson: (id: string): void => {
      setPersonId(id);
      setLookId(null);
    },
    selectModel: setModelChoice,
    togglePick: (garment: Garment): void => {
      const slot = garment.slot;
      if (slot === null) return;
      setPicks((current: Picks): Picks => {
        const next = { ...current };
        if (current[slot] === garment.id) delete next[slot];
        else next[slot] = garment.id;
        return next;
      });
    },
    setFit: (change: { slot: Slot; fit: Fit | null }): void =>
      setFits((current: Fits): Fits => {
        const next = { ...current };
        if (change.fit === null) delete next[change.slot];
        else next[change.slot] = change.fit;
        return next;
      }),
    clearPicks: (): void => setPicks({}),
    setPicks: (next: Picks): void => {
      setPicks(next);
      setLookId(null);
    },
    showLook: setLookId,
    setCompareOn,
    tryOn: (): void => {
      if (!person || !canTryOn) return;
      setBusy(true);
      run(async (): Promise<void> => {
        try {
          const look = await createLook({ personId: person.id, model: modelId, items });
          setLookId(look.id);
          setCompareOn(true);
        } finally {
          setBusy(false);
        }
      });
    },
    addPhotos: (): void =>
      run(async (): Promise<void> => {
        const files = await pickImages();
        if (files.length > 0) upload(files);
      }),
    dropPhotos: upload,
    remove: (ref: EntityRef): void =>
      run(async (): Promise<void> => {
        await deleteEntity(ref);
        if (ref.kind === 'looks' && ref.id === lookId) setLookId(null);
      }),
    retry: (ref: EntityRef): void => run((): Promise<void> => retryAnalysis(ref)),
    move: (input: MoveGarmentInput): void => run((): Promise<void> => moveGarment(input)),
  };
};
