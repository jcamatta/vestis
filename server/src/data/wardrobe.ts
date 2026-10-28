import type { Extraction } from "./extraction.js";
import type { Garment } from "./garment.js";
import type { Look } from "./look.js";
import type { Person } from "./person.js";

export type Wardrobe = {
  version: 3;
  updatedAt: string;
  people: Person[];
  garments: Garment[];
  looks: Look[];
  extractions: Extraction[];
};

export type WardrobeUpdate = (wardrobe: Wardrobe) => Wardrobe;
