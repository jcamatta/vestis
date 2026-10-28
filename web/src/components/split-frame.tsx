import type { JSX, KeyboardEvent, PointerEvent } from 'react';
import type { CompareSide, Size } from '../data/selection';

export type SplitFrameProps = {
  size: Size;
  before: CompareSide;
  after: CompareSide;
  /** Divider position, 0–100 from the left. */
  position: number;
  onPointer: (event: PointerEvent<HTMLDivElement>) => void;
  onKey: (event: KeyboardEvent<HTMLDivElement>) => void;
};

const LABEL = 'absolute bottom-2 bg-fg px-2 py-0.5 font-mono text-2xs text-bg uppercase';

/** "before" on the left of the divider, "after" on the right. */
export const SplitFrame = (props: SplitFrameProps): JSX.Element => (
  <div
    role="slider"
    tabIndex={0}
    aria-label="Before and after divider"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(props.position)}
    onPointerDown={props.onPointer}
    onPointerMove={props.onPointer}
    onKeyDown={props.onKey}
    style={{ width: props.size.width, height: props.size.height }}
    className="relative cursor-ew-resize touch-none overflow-hidden border border-line bg-bg select-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg"
  >
    <img src={props.after.url} alt={props.after.label} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
    <img
      src={props.before.url}
      alt={props.before.label}
      draggable={false}
      style={{ clipPath: `inset(0 ${100 - props.position}% 0 0)` }}
      className="absolute inset-0 h-full w-full object-cover"
    />
    <div style={{ left: `${props.position}%` }} className="absolute inset-y-0 w-px -translate-x-1/2 bg-bg mix-blend-difference" />
    <div
      style={{ left: `${props.position}%` }}
      className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-line bg-bg font-mono text-2xs"
    >
      ◂▸
    </div>
    <span className={`${LABEL} left-2`}>{props.before.label}</span>
    <span className={`${LABEL} right-2`}>{props.after.label}</span>
  </div>
);
