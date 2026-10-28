import type { DragEvent, JSX } from 'react';
import { ImagePlus, LoaderCircle, RotateCcw, ScanSearch, Scissors, Shirt, Trash2 } from 'lucide-react';
import { ItemRow } from '../components/item-row';
import { OutfitStrip } from '../components/outfit-strip';
import { TextButton } from '../components/text-button';
import { FittedImage } from '../controllers/fitted-image';
import type { ExtractState } from '../controllers/use-extract';
import type { Extraction, ExtractionItem } from '../data/wardrobe';
import { droppedImages } from '../pure/dropped-images';
import { extractionRunning, extractionStatusLabel, itemsEditable, selectedCount } from '../pure/extraction';
import { anySearching, canSearchItem, totalLabel } from '../pure/shopping';
import { fileUrl, findById, modelName } from '../pure/wardrobe';

const ratioOf = (image: { width: number; height: number }): number => image.width / image.height;

type StatusOverlayProps = { extraction: Extraction };

/** Laid over the photo while Claude reads it or the sheet is generated, and after a failure. */
const StatusOverlay = (props: StatusOverlayProps): JSX.Element => (
  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 border-t border-line bg-bg px-3 py-2">
    <span className="font-mono text-2xs tracking-wide uppercase">
      {extractionStatusLabel(props.extraction)}
      {extractionRunning(props.extraction) && <LoaderCircle aria-hidden size={12} className="ml-1.5 inline animate-spin align-[-2px]" />}
    </span>
    {props.extraction.error && <span className="text-sm">{props.extraction.error}</span>}
  </div>
);

type LabelledProps = { label: string; url: string; ratio: number; overlay?: JSX.Element };

/** An image with its name as a chip in the corner, like Before / After; tops line up with its neighbour. */
const Labelled = (props: LabelledProps): JSX.Element => (
  <div className="min-h-0 min-w-0">
    <FittedImage
      url={props.url}
      alt={props.label}
      ratio={props.ratio}
      align="start"
      overlay={
        <>
          <span className="absolute top-2 left-2 bg-fg px-2 py-0.5 font-mono text-2xs text-bg uppercase">{props.label}</span>
          {props.overlay}
        </>
      }
    />
  </div>
);

const Stage = (props: ExtractState): JSX.Element => {
  const e = props.extraction;
  if (!e) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-sm text-md">Add a photo of someone wearing an outfit you like.</p>
        <p className="max-w-sm text-sm text-muted">
          Claude lists what they wear; one generation turns the items you tick into product photos in your wardrobe. Drop the photo here, right-click
          it in a shop → Extract outfit, or:
        </p>
        <TextButton label="Add photo" icon={ImagePlus} onClick={props.addPhotos} />
      </div>
    );
  }
  const overlay = e.status === 'done' || e.status === 'ready' ? undefined : <StatusOverlay extraction={e} />;
  if (!e.result) return <FittedImage url={fileUrl(e.image)} alt={e.name} ratio={ratioOf(e.image)} overlay={overlay} />;
  return (
    <div className="grid h-full min-h-0 grid-cols-2 gap-4">
      <Labelled label="Photo" url={fileUrl(e.image)} ratio={ratioOf(e.image)} />
      <Labelled label="Extracted" url={fileUrl(e.result)} ratio={ratioOf(e.result)} overlay={overlay} />
    </div>
  );
};

type ActionsProps = { state: ExtractState; extraction: Extraction };

const Actions = (props: ActionsProps): JSX.Element => {
  const { state, extraction: e } = props;
  const model = modelName({ models: state.models, id: e.model }).label;
  if (e.status === 'done') {
    return (
      <>
        <div className="flex gap-2">
          <div className="flex-1">
            <TextButton label="Try these on" icon={Shirt} variant="primary" wide disabled={state.extracted.length === 0} onClick={state.tryTheseOn} />
          </div>
          <TextButton
            label="Lens"
            title="Find where to buy every item with Google Lens (opens one tab per item)"
            icon={anySearching(e) ? LoaderCircle : ScanSearch}
            spin={anySearching(e)}
            variant="secondary"
            disabled={!state.canSearchAll}
            onClick={state.searchAll}
          />
        </div>
        <p className="text-2xs text-muted">The items are in your wardrobe, marked "from photo". Try on picks one per section.</p>
      </>
    );
  }
  if (e.status === 'error' && e.items.length === 0) {
    return <TextButton label="Read the photo again" icon={RotateCcw} wide onClick={state.retryReading} />;
  }
  const count = selectedCount(e);
  return (
    <>
      <TextButton label={e.status === 'error' ? 'Extract again' : 'Extract'} icon={Scissors} variant="primary" wide disabled={!state.canExtract} onClick={state.extract} />
      <p className="text-2xs text-muted">
        {itemsEditable(e) ? `One ${model} generation for ${count} item${count === 1 ? '' : 's'}.` : extractionStatusLabel(e)}
      </p>
    </>
  );
};

const Items = (props: ExtractState): JSX.Element | null => {
  const e = props.extraction;
  if (!e) return null;
  return (
    <aside className="flex min-h-0 flex-col border-l border-line">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-mono text-2xs tracking-wide uppercase">
          Items <span className="text-muted">· {e.status === 'done' ? `${props.extracted.length} extracted` : `${selectedCount(e)}/${e.items.length}`}</span>
        </h2>
        <TextButton label="Delete outfit" icon={Trash2} variant="quiet" disabled={e.status === 'extracting'} onClick={props.remove} />
      </header>
      {e.shopping?.total && <p className="border-b border-line px-4 py-2 font-mono text-2xs tracking-wide uppercase">{totalLabel(e.shopping.total)}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {e.status === 'analyzing' && <p className="px-4 py-3 text-2xs text-muted">Claude is listing what they wear…</p>}
        <ul>
          {e.items.map(
            (item: ExtractionItem, index: number): JSX.Element => (
              <ItemRow
                key={`${index}-${item.name}`}
                item={item}
                garment={findById({ list: props.garments, id: item.garmentId })}
                editable={itemsEditable(e)}
                onToggle={(): void => props.toggleItem(index)}
                shopping={e.shopping?.items[index]}
                canSearch={canSearchItem({ extraction: e, index })}
                onSearch={(): void => props.searchItem(index)}
              />
            ),
          )}
        </ul>
      </div>
      <div className="flex flex-col gap-2 border-t border-line px-4 py-4">
        <Actions state={props} extraction={e} />
        {props.error && <p className="text-2xs">{props.error}</p>}
      </div>
    </aside>
  );
};

export const ExtractView = (props: ExtractState): JSX.Element => {
  const onDrop = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    const files = droppedImages(event.dataTransfer);
    if (files.length > 0) props.dropPhotos(files);
  };
  return (
    <div className={`grid h-full min-h-0 ${props.extraction ? 'grid-cols-[minmax(0,1fr)_400px]' : 'grid-cols-1'}`}>
      <main
        onDragOver={(event: DragEvent<HTMLElement>): void => event.preventDefault()}
        onDrop={onDrop}
        className="flex min-h-0 min-w-0 flex-col gap-4 bg-subtle p-4"
      >
        <OutfitStrip extractions={props.extractions} selectedId={props.extraction?.id} onSelect={props.select} onAdd={props.addPhotos} />
        <div className="min-h-0 flex-1">
          <Stage {...props} />
        </div>
      </main>
      <Items {...props} />
    </div>
  );
};
