import { rm } from "node:fs/promises";
import { join } from "node:path";

export type RemoveFilesInput = { mediaDir: string; files: (string | null | undefined)[] };

/** Best effort: files that are already gone are fine. */
export const removeFiles = async (input: RemoveFilesInput): Promise<void> => {
  await Promise.all(
    input.files
      .filter((f: string | null | undefined): f is string => typeof f === "string" && f !== "")
      .map((f: string): Promise<void> => rm(join(input.mediaDir, f), { force: true }).catch((e: unknown): void => console.error(`Could not remove ${f}:`, e))),
  );
};
