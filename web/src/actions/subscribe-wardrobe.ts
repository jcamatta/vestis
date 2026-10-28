import type { Wardrobe } from '../data/wardrobe';

export type SubscribeInput = { onWardrobe: (wardrobe: Wardrobe) => void; onOpen: () => void };

export type Unsubscribe = () => void;

const RETRY_MS = 2000;

/**
 * Every `wardrobe` event carries the full wardrobe. EventSource reconnects by itself after a dropped stream,
 * but gives up for good on an HTTP error (e.g. the proxy's 502 while the server is down), so reopen it then.
 */
export const subscribeWardrobe = (input: SubscribeInput): Unsubscribe => {
  let source: EventSource | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const handle = (event: MessageEvent<string>): void => input.onWardrobe(JSON.parse(event.data) as Wardrobe);
  const open = (): void => input.onOpen();
  const connect = (): void => {
    source = new EventSource('/api/events');
    source.addEventListener('wardrobe', handle);
    source.addEventListener('open', open);
    source.addEventListener('error', (): void => {
      if (stopped || source?.readyState !== EventSource.CLOSED) return;
      timer = setTimeout(connect, RETRY_MS);
    });
  };
  connect();
  return (): void => {
    stopped = true;
    clearTimeout(timer);
    source?.close();
  };
};
