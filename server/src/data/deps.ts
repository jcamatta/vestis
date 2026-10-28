import type { Wardrobe, WardrobeUpdate } from "./wardrobe.js";

export type Paths = {
  root: string;
  wardrobe: string;
  media: string;
  skills: string;
  webDist: string;
};

export type Deps = {
  paths: Paths;
  read: () => Promise<Wardrobe>;
  commit: (update: WardrobeUpdate) => Promise<Wardrobe>;
};
