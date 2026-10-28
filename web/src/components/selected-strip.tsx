import type { JSX } from 'react';
import { X } from 'lucide-react';
import type { Garment } from '../data/wardrobe';
import { fileUrl } from '../pure/wardrobe';
import { TextButton } from './text-button';

export type SelectedStripProps = { garments: Garment[]; onClear: () => void };

export const SelectedStrip = (props: SelectedStripProps): JSX.Element => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="font-mono text-2xs tracking-wide uppercase">Selected · {props.garments.length}</span>
      {props.garments.length > 0 && <TextButton label="Clear" icon={X} variant="quiet" onClick={props.onClear} />}
    </div>
    <div className="flex h-12 gap-2">
      {props.garments.length === 0 && <span className="self-center text-2xs text-muted">Pick one garment per section.</span>}
      {props.garments.map(
        (g: Garment): JSX.Element => (
          <img key={g.id} src={fileUrl(g.image)} alt={g.name} title={g.name} className="h-12 w-12 border border-line bg-bg object-contain p-0.5" />
        ),
      )}
    </div>
  </div>
);
