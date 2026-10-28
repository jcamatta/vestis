import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { Wardrobe, WardrobeUpdate } from "../data/wardrobe.js";
import { emptyWardrobe, normalizeWardrobe } from "../pure/wardrobe.js";

/** A missing file reads as an empty wardrobe. */
export const readWardrobe = async (path: string): Promise<Wardrobe> => {
  try {
    return normalizeWardrobe(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyWardrobe(new Date().toISOString());
    throw error;
  }
};

type RenameInput = { from: string; to: string; attempt: number };

/** Windows can refuse a rename briefly (EPERM/EBUSY/EACCES) while another process has the target open. */
const renameWithRetry = async (input: RenameInput): Promise<void> => {
  try {
    await rename(input.from, input.to);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "";
    if (input.attempt >= 10 || !["EPERM", "EBUSY", "EACCES"].includes(code)) throw error;
    await sleep(25 * (input.attempt + 1));
    await renameWithRetry({ ...input, attempt: input.attempt + 1 });
  }
};

export type WriteWardrobeInput = { path: string; wardrobe: Wardrobe };

/** Atomic write: temp file in the same folder, then rename over the target. */
export const writeWardrobe = async (input: WriteWardrobeInput): Promise<void> => {
  await mkdir(dirname(input.path), { recursive: true });
  const temp = `${input.path}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(input.wardrobe, null, 2)}\n`, "utf8");
    await renameWithRetry({ from: temp, to: input.path, attempt: 0 });
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
};

let queueTail: Promise<unknown> = Promise.resolve();

export type MutateInput = { path: string; update: WardrobeUpdate; onWrite: (wardrobe: Wardrobe) => void };

/** Serialised read → pure update → atomic write → notify. */
export const mutateWardrobe = (input: MutateInput): Promise<Wardrobe> => {
  const run = queueTail.then(async (): Promise<Wardrobe> => {
    const next: Wardrobe = { ...input.update(await readWardrobe(input.path)), updatedAt: new Date().toISOString() };
    await writeWardrobe({ path: input.path, wardrobe: next });
    input.onWrite(next);
    return next;
  });
  queueTail = run.catch((): undefined => undefined);
  return run;
};
