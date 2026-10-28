import { useCallback, useState } from 'react';
import type { Size } from '../data/selection';

export type BoxSize = { ref: (element: HTMLElement | null) => void; size: Size };

/** Tracks an element's content size with a ResizeObserver (React 19 ref callbacks can return a cleanup). */
export const useBoxSize = (): BoxSize => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const ref = useCallback((element: HTMLElement | null): (() => void) | undefined => {
    if (element === null) return undefined;
    const observer = new ResizeObserver((entries: ResizeObserverEntry[]): void => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return (): void => observer.disconnect();
  }, []);
  return { ref, size };
};
