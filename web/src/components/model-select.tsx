import type { JSX } from 'react';
import { Select } from '@base-ui/react/select';
import type { ModelOption } from '../data/wardrobe';

export type ModelSelectProps = { modelId: string; models: ModelOption[]; onSelect: (id: string) => void };

export const ModelSelect = (props: ModelSelectProps): JSX.Element => (
  <Select.Root<string>
    items={props.models.map((m: ModelOption): { value: string; label: string } => ({ value: m.id, label: m.label }))}
    value={props.modelId}
    onValueChange={(value: string | null): void => {
      if (value !== null) props.onSelect(value);
    }}
  >
    <Select.Trigger
      aria-label="Model"
      className="flex h-8 w-48 min-w-0 items-center justify-between gap-3 border border-line bg-bg px-3 text-sm text-fg select-none hover:bg-subtle data-popup-open:bg-subtle focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="font-mono text-2xs text-muted uppercase">Model</span>
        <Select.Value className="min-w-0 truncate" />
      </span>
      <Select.Icon className="font-mono text-2xs text-muted">▾</Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner className="z-10 outline-none select-none" sideOffset={4} alignItemWithTrigger={false}>
        <Select.Popup className="min-w-(--anchor-width) border border-line bg-bg text-fg outline-none">
          <Select.List className="max-h-(--available-height) overflow-y-auto py-1">
            {props.models.map(
              (model: ModelOption): JSX.Element => (
                <Select.Item
                  key={model.id}
                  value={model.id}
                  className="flex cursor-default items-center gap-2 px-3 py-1.5 text-sm outline-none select-none data-highlighted:bg-fg data-highlighted:text-bg"
                >
                  <Select.ItemText>{model.label}</Select.ItemText>
                </Select.Item>
              ),
            )}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>
);
