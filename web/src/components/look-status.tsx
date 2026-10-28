import type { JSX } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { Look } from '../data/wardrobe';
import { lookStatusLabel } from '../pure/wardrobe';

export type LookStatusProps = { look: Look };

/** Laid over the photo while a look is running or after it failed. */
export const LookStatus = (props: LookStatusProps): JSX.Element => (
  <div className="absolute inset-0 flex items-end bg-bg/60">
    <div className="flex w-full flex-col gap-1 border-t border-line bg-bg px-3 py-2">
      <span className="font-mono text-2xs tracking-wide uppercase">
        {lookStatusLabel(props.look)}
        {props.look.status !== 'error' && <LoaderCircle aria-hidden size={12} className="ml-1.5 inline animate-spin align-[-2px]" />}
      </span>
      {props.look.error && <span className="text-sm">{props.look.error}</span>}
    </div>
  </div>
);
