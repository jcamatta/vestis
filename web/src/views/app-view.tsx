import type { JSX } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { ModelSelect } from '../components/model-select';
import { ViewTabs } from '../components/view-tabs';
import type { AppController } from '../controllers/use-app-controller';
import type { ViewTab } from '../data/selection';
import { ExtractView } from './extract-view';
import { LooksView } from './looks-view';
import { TryOnView } from './try-on-view';

export const AppView = (props: AppController): JSX.Element => {
  if (props.status !== 'ready') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        {props.status === 'loading' ? 'Loading…' : 'The Vestis server is not running. Start it with npm run dev in vestis/.'}
      </div>
    );
  }
  return (
    <Tabs.Root value={props.tab} onValueChange={(value: ViewTab): void => props.setTab(value)} className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line px-4">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm tracking-widest uppercase">Vestis</span>
          {props.tab !== 'extract' && <ModelSelect modelId={props.tryOn.modelId} models={props.tryOn.models} onSelect={props.tryOn.selectModel} />}
        </div>
        <ViewTabs lookCount={props.looks.looks.length} outfitCount={props.extract.extractions.length} />
      </header>
      <Tabs.Panel value="tryon" className="min-h-0 flex-1">
        <TryOnView {...props.tryOn} />
      </Tabs.Panel>
      <Tabs.Panel value="extract" className="min-h-0 flex-1">
        <ExtractView {...props.extract} />
      </Tabs.Panel>
      <Tabs.Panel value="looks" className="min-h-0 flex-1">
        <LooksView {...props.looks} />
      </Tabs.Panel>
    </Tabs.Root>
  );
};
