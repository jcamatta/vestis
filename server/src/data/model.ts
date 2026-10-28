export type AspectRatio = { label: string; value: number };

export type TryOnModel = {
  /** Higgsfield model id. */
  id: string;
  label: string;
  /** Fits under a look thumbnail. */
  short: string;
  /** File name in tryon/skills/. */
  skill: string;
  aspectRatios: AspectRatio[];
  /** Extra generate_image params, sent as-is. */
  params: Record<string, string | number>;
};
