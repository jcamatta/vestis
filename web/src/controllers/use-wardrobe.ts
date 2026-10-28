import { useEffect, useState } from 'react';
import { fetchModels, fetchWardrobe } from '../actions/api';
import { subscribeWardrobe } from '../actions/subscribe-wardrobe';
import type { Status } from '../data/selection';
import type { ModelOption, Wardrobe } from '../data/wardrobe';
import { newerWardrobe } from '../pure/wardrobe';

export type WardrobeState = { wardrobe: Wardrobe | undefined; models: ModelOption[]; status: Status };

/** Loads the wardrobe and the model list, then follows the SSE stream. Each (re)connect refetches. */
export const useWardrobe = (): WardrobeState => {
  const [wardrobe, setWardrobe] = useState<Wardrobe | undefined>(undefined);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  useEffect((): (() => void) => {
    const controller = new AbortController();
    const accept = (next: Wardrobe): void => {
      setWardrobe((current: Wardrobe | undefined): Wardrobe => newerWardrobe({ current, next }));
      setStatus('ready');
    };
    const fail = (error: unknown): void => {
      if (controller.signal.aborted) return;
      console.error(error);
      setStatus((current: Status): Status => (current === 'ready' ? current : 'error'));
    };
    const load = (): void => {
      fetchWardrobe(controller.signal).then(accept).catch(fail);
    };
    fetchModels(controller.signal).then(setModels).catch(fail);
    load();
    const unsubscribe = subscribeWardrobe({ onWardrobe: accept, onOpen: load });
    return (): void => {
      controller.abort();
      unsubscribe();
    };
  }, []);

  return { wardrobe, models, status };
};
