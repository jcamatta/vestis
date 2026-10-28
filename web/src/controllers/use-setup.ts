import { useEffect, useState } from 'react';
import { checkSetup, fetchSetup } from '../actions/api';
import type { Setup } from '../data/setup';

const POLL_MS = 30_000;

export type SetupState = {
  /** The problem to show; null when Claude and Higgsfield are ready or not checked yet. */
  problem: string | null;
  /** False only when a check found a problem: nothing is blocked before the first answer. */
  ready: boolean;
  checking: boolean;
  recheck: () => void;
};

/** Follows the server's Claude and Higgsfield check, and checks again on demand. */
export const useSetup = (): SetupState => {
  const [setup, setSetup] = useState<Setup | undefined>(undefined);
  const [checking, setChecking] = useState<boolean>(false);

  useEffect((): (() => void) => {
    const controller = new AbortController();
    const load = (): void => {
      fetchSetup(controller.signal)
        .then(setSetup)
        .catch((error: unknown): void => {
          if (!controller.signal.aborted) console.error(error);
        });
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return (): void => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  const recheck = (): void => {
    setChecking(true);
    checkSetup()
      .then(setSetup)
      .catch((error: unknown): void => console.error(error))
      .finally((): void => setChecking(false));
  };

  const problem = setup?.problem ?? null;
  return { problem, ready: problem === null, checking, recheck };
};
