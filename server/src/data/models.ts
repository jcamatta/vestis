import type { AspectRatio, TryOnModel } from "./model.js";

const ratio = (label: string): AspectRatio => {
  const [w, h] = label.split(":").map(Number);
  return { label, value: (w ?? 1) / (h ?? 1) };
};

/** The first is the default in Try on. */
export const MODELS: TryOnModel[] = [
  {
    id: "gpt_image_2_5",
    label: "GPT Image 2.5",
    short: "GPT 2.5",
    skill: "gpt_image_2_5.md",
    aspectRatios: ["21:9", "16:9", "27:16", "3:2", "4:3", "5:4", "9:8", "1:1", "8:9", "4:5", "3:4", "2:3", "16:27", "9:16"].map(ratio),
    /** Sunburst is the variant tuned for editing precision. */
    params: { variant: "sunburst", quality: "medium", resolution: "2k" },
  },
  {
    id: "flux_3_image",
    label: "FLUX 3",
    short: "FLUX 3",
    skill: "flux_3_image.md",
    aspectRatios: ["21:9", "2:1", "16:9", "3:2", "7:5", "4:3", "5:4", "1:1", "4:5", "3:4", "5:7", "2:3", "9:16", "1:2"].map(ratio),
    params: { resolution: "1.5k" },
  },
  {
    id: "ideogram_4_5",
    label: "Ideogram 4.5",
    short: "IDEO 4.5",
    skill: "ideogram_4_5.md",
    aspectRatios: ["3:1", "23:9", "22:9", "8:3", "12:5", "2:1", "16:9", "8:5", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "5:8", "9:16", "1:2", "5:12", "3:8", "9:22", "9:23", "1:3"].map(ratio),
    /** Magic prompt off: Claude's prompt is sent exactly as written. */
    params: { resolution: "2k", quality: "high", magic_prompt: "off" },
  },
];

const gpt = MODELS.find((m: TryOnModel): boolean => m.id === "gpt_image_2_5") as TryOnModel;

/** Extract always uses GPT Image 2.5, with its own prompt skill. */
export const EXTRACT_MODEL: TryOnModel = { ...gpt, skill: "extract_gpt_image_2_5.md" };
