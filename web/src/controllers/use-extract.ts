import { useState } from 'react';
import type { FindShopsInput } from '../actions/api';
import { deleteEntity, findShops, retryAnalysis, runExtraction, selectItems, uploadOutfit } from '../actions/api';
import { extensionVersion, openLens } from '../actions/extension';
import { pickImages } from '../actions/pick-images';
import type { Extraction, Garment, ModelOption, Wardrobe } from '../data/wardrobe';
import { extractedGarments, extractionRunning, itemsEditable, selectedCount, toggledSelection } from '../pure/extraction';
import { canSearchAll, canSearchItem } from '../pure/shopping';
import { findById } from '../pure/wardrobe';

export type ExtractState = {
  extractions: Extraction[];
  extraction: Extraction | undefined;
  garments: Garment[];
  /** The cut garments of the shown outfit. */
  extracted: Garment[];
  models: ModelOption[];
  canExtract: boolean;
  canSearchAll: boolean;
  error: string | null;
  select: (id: string) => void;
  addPhotos: () => void;
  dropPhotos: (files: File[]) => void;
  toggleItem: (index: number) => void;
  extract: () => void;
  retryReading: () => void;
  remove: () => void;
  tryTheseOn: () => void;
  /** Google Lens on every cut-out, through the extension. */
  searchAll: () => void;
  /** Google Lens on one item's cut-out. */
  searchItem: (index: number) => void;
};

export type UseExtractInput = { wardrobe: Wardrobe | undefined; models: ModelOption[]; onTryOn: (garments: Garment[]) => void };

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const useExtract = (input: UseExtractInput): ExtractState => {
  const extractions = input.wardrobe?.extractions ?? [];
  const garments = input.wardrobe?.garments ?? [];
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const extraction = findById({ list: extractions, id }) ?? extractions[0];
  const extracted = extraction ? extractedGarments({ extraction, garments }) : [];
  const canSearch = extraction !== undefined && canSearchAll(extraction);
  const canExtract = !busy && extraction !== undefined && itemsEditable(extraction) && selectedCount(extraction) > 0 && !extractionRunning(extraction);

  const run = (task: () => Promise<void>): void => {
    setError(null);
    task().catch((e: unknown): void => setError(errorText(e)));
  };

  /** Lens runs in the extension: without it the server would wait for nothing. */
  const lens = (search: FindShopsInput): void => {
    if (!extensionVersion()) {
      setError('Finding where to buy needs the Vestis extension 0.3 in this Chrome: reload it in chrome://extensions, then reload this page.');
      return;
    }
    run(async (): Promise<void> => openLens({ extractionId: search.id, items: await findShops(search) }));
  };

  const upload = (files: File[]): void =>
    run(async (): Promise<void> => {
      for (const file of files) setId((await uploadOutfit(file)).id);
    });

  return {
    extractions,
    extraction,
    garments,
    extracted,
    models: input.models,
    canExtract,
    canSearchAll: canSearch,
    error,
    select: setId,
    addPhotos: (): void =>
      run(async (): Promise<void> => {
        const files = await pickImages();
        if (files.length > 0) upload(files);
      }),
    dropPhotos: upload,
    toggleItem: (index: number): void => {
      if (!extraction || !itemsEditable(extraction)) return;
      run((): Promise<void> => selectItems({ id: extraction.id, selected: toggledSelection({ extraction, index }) }));
    },
    extract: (): void => {
      if (!extraction || !canExtract) return;
      setBusy(true);
      run(async (): Promise<void> => {
        try {
          await runExtraction(extraction.id);
        } finally {
          setBusy(false);
        }
      });
    },
    retryReading: (): void => {
      if (extraction) run((): Promise<void> => retryAnalysis({ kind: 'extractions', id: extraction.id }));
    },
    remove: (): void => {
      if (!extraction) return;
      run(async (): Promise<void> => {
        await deleteEntity({ kind: 'extractions', id: extraction.id });
        setId(null);
      });
    },
    tryTheseOn: (): void => input.onTryOn(extracted),
    searchAll: (): void => {
      if (extraction && canSearch) lens({ id: extraction.id });
    },
    searchItem: (index: number): void => {
      if (extraction && canSearchItem({ extraction, index })) lens({ id: extraction.id, indexes: [index] });
    },
  };
};
