import type { JSX } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@base-ui/react/button';
import type { Extraction } from '../data/wardrobe';
import { fileUrl } from '../pure/wardrobe';

export type OutfitStripProps = { extractions: Extraction[]; selectedId: string | undefined; onSelect: (id: string) => void; onAdd: () => void };

const THUMB = 'relative h-16 w-12 shrink-0 border bg-bg select-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg';

const badge = (e: Extraction): string | null =>
  ({ analyzing: 'reading', ready: null, queued: 'waiting', extracting: 'working', done: null, error: 'error' })[e.status];

/** Outfit photos, newest first, plus "add". */
export const OutfitStrip = (props: OutfitStripProps): JSX.Element => (
  <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
    <Button
      onClick={(): void => props.onAdd()}
      title="Add a photo of an outfit"
      className={`${THUMB} flex items-center justify-center border-dashed border-line font-mono text-lg text-muted hover:bg-subtle hover:text-fg`}
    >
      <Plus aria-hidden size={18} strokeWidth={1.5} />
    </Button>
    {props.extractions.map(
      (e: Extraction): JSX.Element => (
        <Button
          key={e.id}
          onClick={(): void => props.onSelect(e.id)}
          aria-pressed={e.id === props.selectedId}
          title={e.name}
          className={`${THUMB} ${e.id === props.selectedId ? 'border-fg outline-2 outline-fg' : 'border-line opacity-70 hover:opacity-100'}`}
        >
          <img src={fileUrl(e.image)} alt={e.name} className="h-full w-full object-cover" />
          {badge(e) && <span className="absolute inset-x-0 bottom-0 bg-fg text-center font-mono text-[9px] text-bg uppercase">{badge(e)}</span>}
        </Button>
      ),
    )}
  </div>
);
