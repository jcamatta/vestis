export type ToggleCompareInput = { selected: string[]; id: string };

/** Up to two looks; a third pick replaces the oldest one. */
export const toggleCompare = (input: ToggleCompareInput): string[] => {
  if (input.selected.includes(input.id)) return input.selected.filter((id: string): boolean => id !== input.id);
  return [...input.selected, input.id].slice(-2);
};
