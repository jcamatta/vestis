import type { JSX, ReactNode } from 'react';
import { fitRect } from '../pure/fit-rect';
import { useBoxSize } from './use-box-size';

export type FittedImageProps = {
  url: string;
  alt: string;
  ratio: number;
  overlay?: ReactNode;
  /** Where the image sits in a taller box: centred (default) or at the top, to line up with a neighbour. */
  align?: 'center' | 'start';
};

/** Fills its parent and shows the image as large as fits, with an optional overlay on top. */
export const FittedImage = (props: FittedImageProps): JSX.Element => {
  const box = useBoxSize();
  const size = fitRect({ box: box.size, ratio: props.ratio });
  return (
    <div ref={box.ref} className="relative h-full min-h-0 w-full min-w-0 overflow-hidden">
      <div className={`absolute inset-0 flex justify-center ${props.align === 'start' ? 'items-start' : 'items-center'}`}>
        <div style={{ width: size.width, height: size.height }} className="relative border border-line bg-bg">
          <img src={props.url} alt={props.alt} className="h-full w-full object-contain" />
          {props.overlay}
        </div>
      </div>
    </div>
  );
};
