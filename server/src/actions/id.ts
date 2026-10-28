import { randomUUID } from "node:crypto";

export type IdPrefix = "person" | "garment" | "look" | "extraction";

/** e.g. "garment_3f9a1c2b7d4e" */
export const newId = (prefix: IdPrefix): string => `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
