import { useState } from 'react';
import { deleteEntity } from '../actions/api';
import type { Garment, Look, ModelOption, Person, Wardrobe } from '../data/wardrobe';
import { toggleCompare } from '../pure/compare-pick';
import { findById } from '../pure/wardrobe';

export type LooksState = {
  looks: Look[];
  people: Person[];
  garments: Garment[];
  models: ModelOption[];
  selected: Look[];
  toggle: (id: string) => void;
  clear: () => void;
  remove: (id: string) => void;
};

export type UseLooksInput = { wardrobe: Wardrobe | undefined; models: ModelOption[] };

export const useLooks = (input: UseLooksInput): LooksState => {
  const { wardrobe } = input;
  const [ids, setIds] = useState<string[]>([]);
  const looks = wardrobe?.looks ?? [];
  const selected = ids.flatMap((id: string): Look[] => {
    const look = findById({ list: looks, id });
    return look ? [look] : [];
  });
  return {
    looks,
    people: wardrobe?.people ?? [],
    garments: wardrobe?.garments ?? [],
    models: input.models,
    selected,
    toggle: (id: string): void => setIds((current: string[]): string[] => toggleCompare({ selected: current, id })),
    clear: (): void => setIds([]),
    remove: (id: string): void => {
      setIds((current: string[]): string[] => current.filter((s: string): boolean => s !== id));
      deleteEntity({ kind: 'looks', id }).catch((error: unknown): void => console.error(error));
    },
  };
};
