import type { JSX } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@base-ui/react/button';
import type { Look } from '../data/wardrobe';
import { fileUrl, formatTime, lookStatusLabel } from '../pure/wardrobe';
import { TextButton } from './text-button';

export type LookCardProps = {
  look: Look;
  personName: string;
  modelName: string;
  garmentNames: string[];
  /** 1 or 2 when picked for comparison. */
  slot: number | null;
  onToggle: () => void;
  onRemove: () => void;
};

export const LookCard = (props: LookCardProps): JSX.Element => {
  const { look } = props;
  return (
    <div className={`group relative flex flex-col border ${props.slot ? 'border-fg outline-2 outline-fg' : 'border-line'}`}>
      <Button
        onClick={(): void => props.onToggle()}
        disabled={look.result === null}
        aria-pressed={props.slot !== null}
        className="flex flex-col text-left select-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg enabled:cursor-pointer"
      >
        <div className="relative aspect-[3/4] w-full border-b border-line bg-subtle">
          {look.result ? (
            <img src={fileUrl(look.result)} alt="Look" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center p-3 text-center font-mono text-2xs text-muted uppercase">{lookStatusLabel(look)}</span>
          )}
          {props.slot && <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center bg-fg font-mono text-2xs text-bg">{props.slot}</span>}
        </div>
        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="line-clamp-2 text-sm leading-4">{props.garmentNames.join(' + ')}</span>
          <span className="truncate font-mono text-2xs text-muted uppercase">
            {props.modelName} · {props.personName} · {formatTime(look.createdAt)}
          </span>
        </div>
      </Button>
      <div className="absolute top-1 left-1 hidden bg-bg group-focus-within:block group-hover:block">
        <TextButton label="Delete" icon={Trash2} variant="quiet" onClick={props.onRemove} />
      </div>
    </div>
  );
};
