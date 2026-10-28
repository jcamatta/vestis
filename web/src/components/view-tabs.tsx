import type { JSX } from 'react';
import { Tabs } from '@base-ui/react/tabs';

const TAB =
  'flex h-8 items-center border border-line bg-bg px-3 font-mono text-2xs uppercase tracking-wide text-fg select-none hover:bg-subtle data-active:bg-fg data-active:text-bg focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg';

export type ViewTabsProps = { lookCount: number; outfitCount: number };

/** Try on | Extract | Looks. Must sit inside a Tabs.Root. */
export const ViewTabs = (props: ViewTabsProps): JSX.Element => (
  <Tabs.List aria-label="View" className="flex shrink-0 -space-x-px">
    <Tabs.Tab value="tryon" className={TAB}>
      Try on
    </Tabs.Tab>
    <Tabs.Tab value="extract" className={TAB}>
      Extract {props.outfitCount > 0 ? `· ${props.outfitCount}` : ''}
    </Tabs.Tab>
    <Tabs.Tab value="looks" className={TAB}>
      Looks {props.lookCount > 0 ? `· ${props.lookCount}` : ''}
    </Tabs.Tab>
  </Tabs.List>
);
