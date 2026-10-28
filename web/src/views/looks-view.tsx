import type { JSX } from 'react';
import { X } from 'lucide-react';
import { LookCard } from '../components/look-card';
import { TextButton } from '../components/text-button';
import { SplitView } from '../controllers/split-view';
import type { LooksState } from '../controllers/use-looks';
import type { Look } from '../data/wardrobe';
import { fileUrl, findById, lookGarmentNames, modelName } from '../pure/wardrobe';

type CompareProps = { state: LooksState };

/** One pick → before/after against the photo; two picks → look 1 against look 2. */
const ComparePanel = (props: CompareProps): JSX.Element => {
  const [a, b] = props.state.selected;
  if (!a?.result) {
    return <p className="text-sm text-muted">Pick one look to see it against the photo, or two looks to compare them.</p>;
  }
  const person = findById({ list: props.state.people, id: a.personId });
  const before = b?.result ? { url: fileUrl(a.result), label: 'Look 1' } : { url: person ? fileUrl(person.image) : fileUrl(a.result), label: 'Before' };
  const after = b?.result ? { url: fileUrl(b.result), label: 'Look 2' } : { url: fileUrl(a.result), label: 'After' };
  return <SplitView key={`${a.id}-${b?.id ?? ''}`} before={before} after={after} ratio={a.result.width / a.result.height} />;
};

export const LooksView = (props: LooksState): JSX.Element => {
  if (props.looks.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted">No looks yet. Pick garments and press Try on.</div>;
  }
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(360px,44%)]">
      <div className="min-h-0 overflow-y-auto p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {props.looks.map(
            (look: Look): JSX.Element => {
              const index = props.selected.findIndex((s: Look): boolean => s.id === look.id);
              return (
                <LookCard
                  key={look.id}
                  look={look}
                  modelName={modelName({ models: props.models, id: look.model }).label}
                  personName={findById({ list: props.people, id: look.personId })?.name ?? 'Photo'}
                  garmentNames={lookGarmentNames({ look, garments: props.garments })}
                  slot={index >= 0 ? index + 1 : null}
                  onToggle={(): void => props.toggle(look.id)}
                  onRemove={(): void => props.remove(look.id)}
                />
              );
            },
          )}
        </div>
      </div>
      <aside className="flex min-h-0 flex-col gap-3 border-l border-line bg-subtle p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-2xs tracking-wide uppercase">Compare · {props.selected.length}/2</span>
          {props.selected.length > 0 && <TextButton label="Clear" icon={X} variant="quiet" onClick={props.clear} />}
        </div>
        <div className="min-h-0 flex-1">
          <ComparePanel state={props} />
        </div>
      </aside>
    </div>
  );
};
