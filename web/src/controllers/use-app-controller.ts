import { useState } from 'react';
import type { Status, ViewTab } from '../data/selection';
import type { Garment } from '../data/wardrobe';
import { picksFrom } from '../pure/extraction';
import { useExtract } from './use-extract';
import type { ExtractState } from './use-extract';
import { useLooks } from './use-looks';
import type { LooksState } from './use-looks';
import { useTryOn } from './use-try-on';
import type { TryOnState } from './use-try-on';
import { useWardrobe } from './use-wardrobe';

export type AppController = {
  status: Status;
  tab: ViewTab;
  setTab: (tab: ViewTab) => void;
  tryOn: TryOnState;
  extract: ExtractState;
  looks: LooksState;
};

export const useAppController = (): AppController => {
  const { wardrobe, models, status } = useWardrobe();
  const [tab, setTab] = useState<ViewTab>('tryon');
  const tryOn = useTryOn({ wardrobe, models });
  const looks = useLooks({ wardrobe, models });
  const extract = useExtract({
    wardrobe,
    models,
    onTryOn: (garments: Garment[]): void => {
      tryOn.setPicks(picksFrom(garments));
      setTab('tryon');
    },
  });
  return { status, tab, setTab, tryOn, extract, looks };
};
