import type { JSX } from 'react';
import { Check } from 'lucide-react';
import { Checkbox } from '@base-ui/react/checkbox';
import { SLOT_LABELS } from '../data/slot';
import type { ExtractionItem, Garment, ShoppingItem } from '../data/wardrobe';
import { fileUrl } from '../pure/wardrobe';
import { ShopButton } from './shop-button';

export type ItemRowProps = {
  item: ExtractionItem;
  /** The garment cut for this item, once extracted. */
  garment: Garment | undefined;
  editable: boolean;
  onToggle: () => void;
  /** This item's Lens search. */
  shopping: ShoppingItem | undefined;
  canSearch: boolean;
  onSearch: () => void;
};

/** One item Claude saw on the person: a tick box before extracting; after, the cut product photo and its Lens button. */
export const ItemRow = (props: ItemRowProps): JSX.Element => {
  const { item } = props;
  const lead = props.garment ? (
    <img src={fileUrl(props.garment.image)} alt={item.name} className="h-16 w-13 shrink-0 border border-line bg-bg object-contain p-0.5" />
  ) : (
    <Checkbox.Root
      checked={item.selected}
      disabled={!props.editable}
      onCheckedChange={(): void => props.onToggle()}
      aria-label={`Extract ${item.name}`}
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-line bg-bg select-none data-checked:bg-fg data-checked:text-bg data-disabled:opacity-40 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <Checkbox.Indicator>
        <Check aria-hidden size={12} strokeWidth={2} />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
  return (
    <li className={`flex gap-3 border-b border-line px-4 py-3 ${!item.selected && !props.garment ? 'text-muted' : ''}`}>
      {lead}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-4">{item.name}</span>
        <span className="font-mono text-2xs text-muted uppercase">
          {[SLOT_LABELS[item.slot], item.brand].filter((s: string | null): boolean => !!s).join(' · ')}
        </span>
        <span className="text-2xs text-muted">{item.description}</span>
      </div>
      {props.garment && <ShopButton shopping={props.shopping} canSearch={props.canSearch} onSearch={props.onSearch} />}
    </li>
  );
};
