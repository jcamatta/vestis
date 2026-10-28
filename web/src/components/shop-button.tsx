import type { JSX } from 'react';
import { Popover } from '@base-ui/react/popover';
import { ExternalLink, LoaderCircle, RotateCcw, ScanSearch, ShoppingBag } from 'lucide-react';
import type { ShopOffer, ShoppingItem } from '../data/wardrobe';
import { offerPrice, searchedLabel } from '../pure/shopping';
import { TextButton } from './text-button';

export type ShopButtonProps = {
  /** This item's Lens search, if any. */
  shopping: ShoppingItem | undefined;
  canSearch: boolean;
  onSearch: () => void;
};

const CHIP =
  'flex h-6 shrink-0 items-center gap-1 border border-line px-2 font-mono text-2xs uppercase select-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg';

type OffersProps = { item: ShoppingItem; canSearch: boolean; onSearch: () => void };

/** The products Lens found, each a link to the shop, then the date and Search again. */
const Offers = (props: OffersProps): JSX.Element => (
  <div className="flex flex-col">
    {props.item.offers.map(
      (offer: ShopOffer): JSX.Element => (
        <a
          key={offer.url}
          href={offer.url}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col gap-0.5 border-b border-line px-3 py-2 hover:bg-subtle focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-fg"
        >
          <span className="truncate text-sm leading-4">{offer.title}</span>
          <span className="flex gap-1.5 font-mono text-2xs uppercase">
            <span className="min-w-0 truncate text-muted">{offer.shop}</span>
            <span className="shrink-0">· {offerPrice(offer)}</span>
            <ExternalLink aria-hidden size={12} strokeWidth={1.5} className="ml-auto shrink-0" />
          </span>
        </a>
      ),
    )}
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <span className="flex flex-col font-mono text-2xs text-muted uppercase">
        <span>{props.item.summary}</span>
        {props.item.searchedAt && <span>{searchedLabel(props.item.searchedAt)}</span>}
      </span>
      <TextButton label="Search again" icon={RotateCcw} variant="quiet" disabled={!props.canSearch} onClick={props.onSearch} />
    </div>
  </div>
);

/** Next to each item: Lens searches it; once it found products, the same button shows them on hover or click. Nothing found looks like never searched. */
export const ShopButton = (props: ShopButtonProps): JSX.Element => {
  const item = props.shopping;
  if (item?.status === 'searching') {
    return (
      <span className={`${CHIP} text-muted`}>
        <LoaderCircle aria-hidden size={12} strokeWidth={1.5} className="animate-spin" />
        Lens
      </span>
    );
  }
  if (!item || item.offers.length === 0) {
    return (
      <button
        type="button"
        title={item?.status === 'error' ? item.summary : 'Find where to buy with Google Lens'}
        disabled={!props.canSearch}
        onClick={props.onSearch}
        className={`${CHIP} bg-bg hover:bg-subtle disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-bg`}
      >
        <ScanSearch aria-hidden size={12} strokeWidth={1.5} />
        Lens
      </button>
    );
  }
  return (
    <Popover.Root>
      <Popover.Trigger openOnHover delay={100} className={`${CHIP} bg-fg text-bg`}>
        <ShoppingBag aria-hidden size={12} strokeWidth={1.5} />
        {item.offers.length} found
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="left" align="start" sideOffset={8} className="z-10 outline-none">
          <Popover.Popup className="w-80 border border-line bg-bg text-fg outline-none">
            <Offers item={item} canSearch={props.canSearch} onSearch={props.onSearch} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
