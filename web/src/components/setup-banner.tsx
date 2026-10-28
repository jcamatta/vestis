import type { JSX } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { TextButton } from './text-button';

export type SetupBannerProps = { problem: string; checking: boolean; onCheck: () => void };

/** Under the header while Claude or Higgsfield is not ready: what is wrong, what to do, and a way to check again. */
export const SetupBanner = (props: SetupBannerProps): JSX.Element => (
  <div role="alert" className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-fg px-4 py-2 text-bg">
    <span className="flex items-center gap-2 text-sm">
      <TriangleAlert aria-hidden size={16} strokeWidth={1.5} className="shrink-0" />
      {props.problem} Try on and Extract are off until it is fixed.
    </span>
    <TextButton label={props.checking ? 'Checking…' : 'Check again'} icon={RefreshCw} spin={props.checking} disabled={props.checking} onClick={props.onCheck} />
  </div>
);
