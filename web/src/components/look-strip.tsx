import type { JSX } from 'react';
import { X } from 'lucide-react';
import { Button } from '@base-ui/react/button';
import type { Look, ModelOption } from '../data/wardrobe';
import { fileUrl, modelName } from '../pure/wardrobe';

export type LookStripProps = {
  looks: Look[];
  models: ModelOption[];
  shownId: string | undefined;
  onShow: (id: string | null) => void;
  onRemove: (id: string) => void;
};

const THUMB = 'relative h-20 w-14 shrink-0 border bg-bg select-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg';

const marker = (look: Look): string => (look.status === 'error' ? '!' : look.status === 'done' ? '' : '…');

const finished = (look: Look): boolean => look.status === 'done' || look.status === 'error';

/** This photo's looks, newest first, each labelled with its model; "photo" goes back to the bare photo. Hover a look for its delete button. */
export const LookStrip = (props: LookStripProps): JSX.Element => (
  <div className="flex items-end gap-2 overflow-x-auto pb-1">
    <Button
      onClick={(): void => props.onShow(null)}
      className={`${THUMB} flex items-center justify-center font-mono text-2xs uppercase ${props.shownId === undefined ? 'border-fg bg-fg text-bg' : 'border-line hover:bg-subtle'}`}
    >
      Photo
    </Button>
    {props.looks.map(
      (look: Look): JSX.Element => (
        <div key={look.id} className="group relative flex shrink-0">
          <Button
            onClick={(): void => props.onShow(look.id)}
            aria-pressed={look.id === props.shownId}
            title={modelName({ models: props.models, id: look.model }).label}
            className={`${THUMB} ${look.id === props.shownId ? 'border-fg outline-2 outline-fg' : 'border-line'}`}
          >
            {look.result ? (
              <img src={fileUrl(look.result)} alt="Look" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-mono text-sm text-muted">{marker(look)}</span>
            )}
            <span className="absolute inset-x-0 bottom-0 truncate border-t border-line bg-bg px-0.5 text-center font-mono text-[9px] leading-3 text-fg uppercase">
              {modelName({ models: props.models, id: look.model }).short}
            </span>
          </Button>
          <Button
            onClick={(): void => props.onRemove(look.id)}
            aria-label="Delete look"
            title={finished(look) ? 'Delete look' : 'Delete look (a generation already sent to Higgsfield still finishes)'}
            className="absolute top-0 right-0 hidden h-5 w-5 items-center justify-center border-b border-l border-line bg-bg font-mono text-xs text-muted select-none group-focus-within:flex group-hover:flex hover:bg-fg hover:text-bg focus-visible:outline-1 focus-visible:outline-fg"
          >
            <X aria-hidden size={12} strokeWidth={1.5} />
          </Button>
        </div>
      ),
    )}
  </div>
);
