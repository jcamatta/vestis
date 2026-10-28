import { useState } from 'react';
import type { JSX, KeyboardEvent, PointerEvent } from 'react';
import { SplitFrame } from '../components/split-frame';
import type { CompareSide } from '../data/selection';
import { fitRect } from '../pure/fit-rect';
import { keyPosition, pointerPosition } from '../pure/split-position';
import { useBoxSize } from './use-box-size';

export type SplitViewProps = { before: CompareSide; after: CompareSide; ratio: number };

/** Fills its parent; holds the divider position and fits the frame to the available box. */
export const SplitView = (props: SplitViewProps): JSX.Element => {
  const box = useBoxSize();
  const [position, setPosition] = useState<number>(50);
  const onPointer = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.type === 'pointerdown') event.currentTarget.setPointerCapture(event.pointerId);
    else if (event.buttons !== 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition(pointerPosition({ clientX: event.clientX, left: rect.left, width: rect.width }));
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    const next = keyPosition({ key: event.key, position });
    if (next === position) return;
    event.preventDefault();
    setPosition(next);
  };
  return (
    <div ref={box.ref} className="relative h-full min-h-0 w-full min-w-0 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <SplitFrame
          size={fitRect({ box: box.size, ratio: props.ratio })}
          before={props.before}
          after={props.after}
          position={position}
          onPointer={onPointer}
          onKey={onKey}
        />
      </div>
    </div>
  );
};
