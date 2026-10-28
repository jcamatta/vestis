import type { JSX } from 'react';
import { Check, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@base-ui/react/button';
import type { Garment } from '../data/wardrobe';
import { fileUrl } from '../pure/wardrobe';
import type { Slot } from '../data/slot';
import { MoveMenu } from './move-menu';
import { TextButton } from './text-button';

export type GarmentCardProps = {
  garment: Garment;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onRetry: () => void;
  onMove: (slot: Slot) => void;
};

/** Garments cut from an outfit photo say so instead of a shop name. */
const subtitle = (g: Garment): string =>
  [g.brand, g.source.site === 'extracted' ? 'from photo' : g.source.site].filter((s: string | null): boolean => !!s).join(' · ');

export const GarmentCard = (props: GarmentCardProps): JSX.Element => {
  const g = props.garment;
  const pickable = g.status === 'ready' && !props.disabled;
  return (
    <div className={`group relative flex flex-col border ${props.selected ? 'border-fg outline-1 outline-fg' : 'border-line'} ${props.disabled ? 'opacity-40' : ''}`}>
      <Button
        onClick={(): void => props.onToggle()}
        disabled={!pickable}
        aria-pressed={props.selected}
        title={g.description || g.source.pageTitle}
        className="flex flex-col text-left select-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg enabled:cursor-pointer"
      >
        <div className="relative aspect-[4/5] w-full border-b border-line bg-bg">
          <img src={fileUrl(g.image)} alt={g.name} loading="lazy" className="h-full w-full object-contain p-2" />
          {g.status === 'analyzing' && (
            <span className="absolute inset-x-0 bottom-0 bg-fg px-2 py-1 font-mono text-2xs text-bg uppercase">Reading…</span>
          )}
          {props.selected && (
            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center bg-fg text-bg">
              <Check aria-hidden size={12} strokeWidth={2} />
            </span>
          )}
        </div>
        <div className={`flex min-h-12 flex-col px-2 py-1.5 ${props.selected ? 'bg-fg text-bg' : ''}`}>
          <span className="line-clamp-2 text-sm leading-4">{g.name || 'Untitled'}</span>
          <span className={`truncate font-mono text-2xs uppercase ${props.selected ? 'text-bg/70' : 'text-muted'}`}>{subtitle(g) || '—'}</span>
        </div>
      </Button>
      {g.status === 'error' && (
        <div className="flex flex-col gap-1 border-t border-line px-2 py-1.5">
          <span className="text-2xs text-muted">{g.error}</span>
          <TextButton label="Retry" icon={RotateCcw} variant="quiet" onClick={props.onRetry} />
        </div>
      )}
      <div className="absolute top-1 left-1 hidden bg-bg group-focus-within:flex group-hover:flex has-data-popup-open:flex">
        <TextButton label="Remove" icon={Trash2} variant="quiet" onClick={props.onRemove} />
        {g.status !== 'analyzing' && <MoveMenu current={g.slot} onMove={props.onMove} />}
      </div>
    </div>
  );
};
