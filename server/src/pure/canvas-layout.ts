export type Cell = { left: number; top: number; width: number; height: number };
export type CanvasLayout = { width: number; height: number; cells: Cell[] };

const CELL_W = 640;
const CELL_H = 800;
const GAP = 32;

/** 1 → one cell, 2 → side by side, 3–4 → 2×2, 5 → 3 + 2. Cells are 4:5, the usual product-photo shape; ≤ 3.5 MP overall, under FLUX's 4 MP. */
export const canvasLayout = (count: number): CanvasLayout => {
  const cols = count === 1 ? 1 : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const cells = Array.from({ length: count }, (_: unknown, i: number): Cell => ({
    left: GAP + (i % cols) * (CELL_W + GAP),
    top: GAP + Math.floor(i / cols) * (CELL_H + GAP),
    width: CELL_W,
    height: CELL_H,
  }));
  return { width: GAP + cols * (CELL_W + GAP), height: GAP + rows * (CELL_H + GAP), cells };
};
