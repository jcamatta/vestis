import type { JSX } from 'react';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import type { Fit } from '../data/slot';

export type FitToggleProps = { fits: Fit[]; value: Fit | null; onChange: (fit: Fit | null) => void };

const ITEM =
  'h-6 border border-line bg-bg px-2 font-mono text-2xs uppercase text-fg select-none hover:bg-subtle data-pressed:bg-fg data-pressed:text-bg focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg';

/** Single choice; pressing the active fit again clears it ("as shown"). */
export const FitToggle = (props: FitToggleProps): JSX.Element => (
  <div className="flex items-center gap-2">
    <span className="font-mono text-2xs text-muted uppercase">Fit</span>
    <ToggleGroup<Fit>
      value={props.value ? [props.value] : []}
      onValueChange={(value: Fit[]): void => props.onChange(value[0] ?? null)}
      className="flex -space-x-px"
    >
      {props.fits.map(
        (fit: Fit): JSX.Element => (
          <Toggle<Fit> key={fit} value={fit} className={ITEM}>
            {fit}
          </Toggle>
        ),
      )}
    </ToggleGroup>
  </div>
);
