export type PointerPositionInput = { clientX: number; left: number; width: number };

/** Divider position in percent from a pointer, clamped to 0–100. */
export const pointerPosition = (input: PointerPositionInput): number =>
  input.width <= 0 ? 50 : Math.min(100, Math.max(0, ((input.clientX - input.left) / input.width) * 100));

export type KeyPositionInput = { key: string; position: number };

/** Arrow keys move 2 %, Home/End jump to the edges; other keys leave it. */
export const keyPosition = (input: KeyPositionInput): number => {
  const step = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2 }[input.key];
  if (step !== undefined) return Math.min(100, Math.max(0, input.position + step));
  if (input.key === 'Home') return 0;
  if (input.key === 'End') return 100;
  return input.position;
};
