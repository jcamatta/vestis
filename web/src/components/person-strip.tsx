import type { JSX } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@base-ui/react/button';
import type { Person } from '../data/wardrobe';
import { fileUrl } from '../pure/wardrobe';

export type PersonStripProps = { people: Person[]; selectedId: string | undefined; onSelect: (id: string) => void; onAdd: () => void };

const THUMB = 'relative h-16 w-12 shrink-0 border bg-bg select-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg';

/** Photos of the user, top-left of the stage, as in the BFL demo; plus "add". */
export const PersonStrip = (props: PersonStripProps): JSX.Element => (
  <div className="flex gap-2">
    {props.people.map(
      (p: Person): JSX.Element => (
        <Button
          key={p.id}
          onClick={(): void => props.onSelect(p.id)}
          aria-pressed={p.id === props.selectedId}
          title={p.summary || p.name}
          className={`${THUMB} ${p.id === props.selectedId ? 'border-fg outline-2 outline-fg' : 'border-line opacity-70 hover:opacity-100'}`}
        >
          <img src={fileUrl(p.image)} alt={p.name} className="h-full w-full object-cover" />
          {p.status !== 'ready' && (
            <span className="absolute inset-x-0 bottom-0 bg-fg text-center font-mono text-[9px] text-bg uppercase">
              {p.status === 'analyzing' ? 'reading' : 'error'}
            </span>
          )}
        </Button>
      ),
    )}
    <Button
      onClick={(): void => props.onAdd()}
      title="Add a photo of yourself"
      className={`${THUMB} flex items-center justify-center border-dashed border-line font-mono text-lg text-muted hover:bg-subtle hover:text-fg`}
    >
      <Plus aria-hidden size={18} strokeWidth={1.5} />
    </Button>
  </div>
);
