import type { JSX } from 'react';
import type { EntityRef } from '../actions/api';
import type { MoveGarmentInput } from '../actions/api';
import type { Fit } from '../data/slot';
import type { Garment } from '../data/wardrobe';
import { FitToggle } from './fit-toggle';
import { GarmentCard } from './garment-card';

export type SlotSectionProps = {
  title: string;
  garments: Garment[];
  pickedId: string | undefined;
  /** Why nothing here can be picked, e.g. "Feet not visible in this photo". */
  blockedReason: string | null;
  fits: Fit[] | null;
  fit: Fit | null;
  onFit: (fit: Fit | null) => void;
  onToggle: (garment: Garment) => void;
  onRemove: (ref: EntityRef) => void;
  onRetry: (ref: EntityRef) => void;
  onMove: (input: MoveGarmentInput) => void;
};

export const SlotSection = (props: SlotSectionProps): JSX.Element => (
  <section className="flex flex-col gap-3 border-b border-line px-4 py-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-mono text-2xs tracking-wide uppercase">
        {props.title} <span className="text-muted">· {props.garments.length}</span>
      </h2>
      {props.fits && !props.blockedReason && <FitToggle fits={props.fits} value={props.fit} onChange={props.onFit} />}
    </header>
    {props.blockedReason && <p className="text-2xs text-muted">{props.blockedReason}</p>}
    {props.garments.length === 0 ? (
      <p className="text-2xs text-muted">Nothing yet. Right-click a product photo in a shop → Add to Vestis.</p>
    ) : (
      <div className="grid grid-cols-3 gap-2">
        {props.garments.map(
          (g: Garment): JSX.Element => (
            <GarmentCard
              key={g.id}
              garment={g}
              selected={props.pickedId === g.id}
              disabled={props.blockedReason !== null}
              onToggle={(): void => props.onToggle(g)}
              onRemove={(): void => props.onRemove({ kind: 'garments', id: g.id })}
              onRetry={(): void => props.onRetry({ kind: 'garments', id: g.id })}
              onMove={(slot): void => props.onMove({ id: g.id, slot })}
            />
          ),
        )}
      </div>
    )}
  </section>
);
