import type { JSX } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Menu } from '@base-ui/react/menu';
import { SLOT_LABELS, SLOTS } from '../data/slot';
import type { Slot } from '../data/slot';

export type MoveMenuProps = { current: Slot | null; onMove: (slot: Slot) => void };

/** Moves a garment to another section, for when Claude or the right-click menu filed it wrong. */
export const MoveMenu = (props: MoveMenuProps): JSX.Element => (
  <Menu.Root>
    <Menu.Trigger className="flex h-6 items-center px-1 font-mono text-2xs tracking-wide text-muted uppercase select-none hover:text-fg data-popup-open:text-fg focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg">
      <ArrowRightLeft aria-hidden size={14} strokeWidth={1.5} className="mr-1.5" />
      Move
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Positioner className="z-10 outline-none" sideOffset={4} align="start">
        <Menu.Popup className="border border-line bg-bg py-1 text-fg outline-none">
          {SLOTS.filter((slot: Slot): boolean => slot !== props.current).map(
            (slot: Slot): JSX.Element => (
              <Menu.Item
                key={slot}
                onClick={(): void => props.onMove(slot)}
                className="flex cursor-default px-3 py-1.5 text-sm outline-none select-none data-highlighted:bg-fg data-highlighted:text-bg"
              >
                {SLOT_LABELS[slot]}
              </Menu.Item>
            ),
          )}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  </Menu.Root>
);
