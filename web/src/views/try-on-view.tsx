import type { DragEvent, JSX } from 'react';
import { ImagePlus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { LookStatus } from '../components/look-status';
import { LookStrip } from '../components/look-strip';
import { PersonStrip } from '../components/person-strip';
import { SelectedStrip } from '../components/selected-strip';
import { SlotSection } from '../components/slot-section';
import { TextButton } from '../components/text-button';
import { FittedImage } from '../controllers/fitted-image';
import { SplitView } from '../controllers/split-view';
import type { TryOnState } from '../controllers/use-try-on';
import { SLOT_FITS, SLOT_LABELS, SLOTS } from '../data/slot';
import type { Slot } from '../data/slot';
import type { Garment, Person } from '../data/wardrobe';
import { droppedImages } from '../pure/dropped-images';
import { fileUrl, findById, modelName, slotGarments, unsortedGarments } from '../pure/wardrobe';

const BODY_PART: Record<Slot, string> = { head: 'Head', eyewear: 'Face', top: 'Torso', bottom: 'Legs', shoes: 'Feet' };

type BlockedInput = { person: Person | undefined; slot: Slot };

const blockedReason = (input: BlockedInput): string | null => {
  if (!input.person) return 'Add a photo of yourself first.';
  if (input.person.status === 'analyzing') return 'Reading your photo…';
  if (input.person.status === 'error') return 'Your photo could not be read; retry it.';
  return input.person.visibleSlots.includes(input.slot) ? null : `${BODY_PART[input.slot]} not visible in this photo.`;
};

const ratioOf = (image: { width: number; height: number }): number => image.width / image.height;

const Sidebar = (props: TryOnState): JSX.Element => {
  const unsorted = unsortedGarments(props.garments);
  const picked = SLOTS.flatMap((slot: Slot): Garment[] => {
    const g = findById({ list: props.garments, id: props.picks[slot] });
    return g ? [g] : [];
  });
  return (
    <aside className="flex min-h-0 flex-col border-r border-line">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {unsorted.length > 0 && (
          <section className="flex flex-col gap-2 border-b border-line px-4 py-4">
            <h2 className="font-mono text-2xs tracking-wide uppercase">Sorting · {unsorted.length}</h2>
            <div className="grid grid-cols-3 gap-2">
              {unsorted.map(
                (g: Garment): JSX.Element => (
                  <div key={g.id} className="flex flex-col border border-line">
                    <img src={fileUrl(g.image)} alt={g.name} className="aspect-[4/5] w-full object-contain p-2" />
                    <span className="border-t border-line px-2 py-1 font-mono text-2xs text-muted uppercase">{g.status === 'error' ? 'Failed' : 'Reading…'}</span>
                    {g.status === 'error' && (
                      <div className="flex gap-1 px-1">
                        <TextButton label="Retry" icon={RotateCcw} variant="quiet" onClick={(): void => props.retry({ kind: 'garments', id: g.id })} />
                        <TextButton label="Remove" icon={Trash2} variant="quiet" onClick={(): void => props.remove({ kind: 'garments', id: g.id })} />
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </section>
        )}
        {SLOTS.map(
          (slot: Slot): JSX.Element => (
            <SlotSection
              key={slot}
              title={SLOT_LABELS[slot]}
              garments={slotGarments({ garments: props.garments, slot })}
              pickedId={props.picks[slot]}
              blockedReason={blockedReason({ person: props.person, slot })}
              fits={SLOT_FITS[slot] ?? null}
              fit={props.fits[slot] ?? null}
              onFit={(fit): void => props.setFit({ slot, fit })}
              onToggle={props.togglePick}
              onRemove={props.remove}
              onRetry={props.retry}
              onMove={props.move}
            />
          ),
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-line px-4 py-4">
        <SelectedStrip garments={picked} onClear={props.clearPicks} />
        <TextButton label="Try on" icon={Sparkles} variant="primary" wide disabled={!props.canTryOn} onClick={props.tryOn} />
        {props.error && <p className="text-2xs">{props.error}</p>}
      </div>
    </aside>
  );
};

const StageContent = (props: TryOnState): JSX.Element => {
  const { person, shownLook: look } = props;
  if (!person) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-sm text-md">Add a photo of yourself.</p>
        <p className="max-w-sm text-sm text-muted">Full body, facing the camera, in plain fitted clothes, good light. Drop it here or:</p>
        <TextButton label="Add photo" icon={ImagePlus} onClick={props.addPhotos} />
      </div>
    );
  }
  const personUrl = fileUrl(person.image);
  if (look?.status === 'done' && look.result) {
    const resultUrl = fileUrl(look.result);
    return props.compareOn ? (
      <SplitView key={look.id} before={{ url: personUrl, label: 'Before' }} after={{ url: resultUrl, label: 'After' }} ratio={ratioOf(look.result)} />
    ) : (
      <FittedImage url={resultUrl} alt="Look" ratio={ratioOf(look.result)} />
    );
  }
  const overlay = look ? <LookStatus look={look} /> : person.status !== 'ready' ? <PersonOverlay person={person} retry={props.retry} /> : undefined;
  return <FittedImage url={personUrl} alt={person.name} ratio={ratioOf(person.image)} overlay={overlay} />;
};

type PersonOverlayProps = { person: Person; retry: TryOnState['retry'] };

const PersonOverlay = (props: PersonOverlayProps): JSX.Element => (
  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-line bg-bg px-3 py-2">
    <span className="font-mono text-2xs uppercase">{props.person.status === 'analyzing' ? 'Reading your photo…' : props.person.error}</span>
    {props.person.status === 'error' && <TextButton label="Retry" icon={RotateCcw} onClick={(): void => props.retry({ kind: 'people', id: props.person.id })} />}
  </div>
);

const StageFooter = (props: TryOnState): JSX.Element | null => {
  const { person, shownLook: look } = props;
  if (!person) return null;
  const caption = look
    ? modelName({ models: props.models, id: look.model }).label
    : (person.summary ? `${person.summary} · visible: ${person.visibleSlots.join(', ') || 'nothing'}` : '');
  return (
    <div className="flex flex-col gap-3">
      {caption && (
        <p title={caption} className="line-clamp-2 font-mono text-2xs text-muted">
          {caption}
        </p>
      )}
      <LookStrip looks={props.looks} models={props.models} shownId={look?.id} onShow={props.showLook} onRemove={(id: string): void => props.remove({ kind: 'looks', id })} />
    </div>
  );
};

const StageToolbar = (props: TryOnState): JSX.Element => {
  const { person, shownLook: look } = props;
  return (
    <div className="flex items-start justify-between gap-4">
      <PersonStrip people={props.people} selectedId={person?.id} onSelect={props.selectPerson} onAdd={props.addPhotos} />
      <div className="flex gap-2">
        {look?.status === 'done' && (
          <TextButton label={props.compareOn ? 'Result only' : 'Compare'} onClick={(): void => props.setCompareOn(!props.compareOn)} />
        )}
        {person && !look && <TextButton label="Delete photo" icon={Trash2} onClick={(): void => props.remove({ kind: 'people', id: person.id })} />}
      </div>
    </div>
  );
};

export const TryOnView = (props: TryOnState): JSX.Element => {
  const onDrop = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    const files = droppedImages(event.dataTransfer);
    if (files.length > 0) props.dropPhotos(files);
  };
  return (
    <div className="grid h-full min-h-0 grid-cols-[440px_minmax(0,1fr)]">
      <Sidebar {...props} />
      <main
        onDragOver={(event: DragEvent<HTMLElement>): void => event.preventDefault()}
        onDrop={onDrop}
        className="flex min-h-0 min-w-0 flex-col gap-4 bg-subtle p-4"
      >
        <StageToolbar {...props} />
        <div className="min-h-0 flex-1">
          <StageContent {...props} />
        </div>
        <StageFooter {...props} />
      </main>
    </div>
  );
};
