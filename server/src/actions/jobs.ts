import { join } from "node:path";
import type { Deps } from "../data/deps.js";
import type { Garment } from "../data/garment.js";
import type { Look } from "../data/look.js";
import { MODELS } from "../data/models.js";
import type { Person } from "../data/person.js";
import { garmentAnswerSchema, generationAnswerSchema, personAnswerSchema } from "../data/schemas.js";
import { SLOTS } from "../data/slot.js";
import { nearestRatio } from "../pure/aspect.js";
import { canvasLayout } from "../pure/canvas-layout.js";
import { generationStep } from "../pure/claude-stream.js";
import { checkLook } from "../pure/look.js";
import { garmentSchema, garmentTask, generationSchema, generationTask, personSchema, personTask } from "../pure/tasks.js";
import { patchGarment, patchLook, patchPerson } from "../pure/wardrobe.js";
import { runClaude } from "./claude.js";
import { download } from "./download.js";
import { composeCanvas, saveImage } from "./image.js";
import { analysisQueue, generationQueue, HF_TOOL_PREFIX as TOOL_PREFIX, HF_TOOLS } from "./queues.js";

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export type AnalyzeGarmentInput = { deps: Deps; garment: Garment; requestedSlot: Garment["slot"] };

export const analyzeGarment = (input: AnalyzeGarmentInput): void =>
  analysisQueue(async (): Promise<void> => {
    const { deps, garment } = input;
    const result = await runClaude({
      cwd: deps.paths.media,
      run: {
        prompt: garmentTask({ imagePath: join(deps.paths.media, garment.image.file), pageTitle: garment.source.pageTitle, pageUrl: garment.source.pageUrl, slot: input.requestedSlot }),
        schema: garmentSchema,
        tools: ["Read"],
        dirs: [],
        timeoutMs: 180_000,
      },
    });
    const answer = result.ok ? garmentAnswerSchema.safeParse(result.value) : null;
    const patch: Partial<Garment> =
      answer?.success
        ? { status: "ready", slot: input.requestedSlot ?? answer.data.slot, name: answer.data.name, brand: answer.data.brand, description: answer.data.description, error: null }
        : { status: "error", error: result.ok ? "Claude gave an unexpected answer." : result.error };
    await deps.commit(patchGarment({ id: garment.id, patch }));
  });

export type AnalyzePersonInput = { deps: Deps; person: Person };

export const analyzePerson = (input: AnalyzePersonInput): void =>
  analysisQueue(async (): Promise<void> => {
    const { deps, person } = input;
    const result = await runClaude({
      cwd: deps.paths.media,
      run: { prompt: personTask({ imagePath: join(deps.paths.media, person.image.file) }), schema: personSchema, tools: ["Read"], dirs: [], timeoutMs: 180_000 },
    });
    const answer = result.ok ? personAnswerSchema.safeParse(result.value) : null;
    const patch: Partial<Person> = answer?.success
      ? { status: "ready", visibleSlots: SLOTS.filter((s): boolean => answer.data.visibleSlots.includes(s)), summary: answer.data.summary, error: null }
      : { status: "error", error: result.ok ? "Claude gave an unexpected answer." : result.error };
    await deps.commit(patchPerson({ id: person.id, patch }));
  });

type LookPatch = { deps: Deps; id: string; patch: Partial<Look> };

const setLook = async (input: LookPatch): Promise<void> => {
  await input.deps.commit(patchLook({ id: input.id, patch: input.patch }));
};

const failLook = async (input: { deps: Deps; id: string; error: string }): Promise<void> =>
  setLook({ deps: input.deps, id: input.id, patch: { status: "error", step: null, error: input.error, finishedAt: new Date().toISOString() } });

const generate = async (input: { deps: Deps; look: Look }): Promise<void> => {
  const { deps, look } = input;
  const wardrobe = await deps.read();
  if (!wardrobe.looks.some((l: Look): boolean => l.id === look.id)) return;
  const checked = checkLook({ wardrobe, request: { personId: look.personId, items: look.items, model: look.model } });
  if (!checked.ok) return failLook({ deps, id: look.id, error: checked.error });
  const { person, items, garments } = checked.value;
  const model = MODELS.find((m): boolean => m.id === look.model);
  if (!model) return failLook({ deps, id: look.id, error: `Unknown model ${look.model}` });

  await setLook({ deps, id: look.id, patch: { status: "preparing" } });
  const canvas = await composeCanvas({
    paths: garments.map((g: Garment): string => join(deps.paths.media, g.image.file)),
    layout: canvasLayout(garments.length),
    mediaDir: deps.paths.media,
    file: `canvases/${look.id}.jpg`,
  });

  await setLook({ deps, id: look.id, patch: { status: "generating", step: "Starting Claude", canvas } });
  let step = "Starting Claude";
  const onTool = (tool: string): void => {
    const next = generationStep({ tool, prefix: TOOL_PREFIX, current: step });
    if (next === null) return;
    step = next;
    void setLook({ deps, id: look.id, patch: { step: next } });
  };
  const result = await runClaude({
    cwd: deps.paths.media,
    onTool,
    run: {
      prompt: generationTask({
        model,
        skillPath: join(deps.paths.skills, model.skill),
        personPath: join(deps.paths.media, person.image.file),
        personMediaId: person.higgsfieldMediaId,
        canvasPath: join(deps.paths.media, canvas.file),
        items,
        garments,
        aspectRatio: nearestRatio({ width: person.image.width, height: person.image.height, ratios: model.aspectRatios }),
        toolPrefix: TOOL_PREFIX,
      }),
      schema: generationSchema,
      tools: ["Read", "Bash(curl *)", ...HF_TOOLS],
      dirs: [deps.paths.skills],
      timeoutMs: 15 * 60_000,
    },
  });
  if (!result.ok) return failLook({ deps, id: look.id, error: result.error });
  const parsed = generationAnswerSchema.safeParse(result.value);
  if (!parsed.success) return failLook({ deps, id: look.id, error: "Claude gave an unexpected answer." });
  const answer = parsed.data;
  if (answer.personMediaId && answer.personMediaId !== person.higgsfieldMediaId) {
    await deps.commit(patchPerson({ id: person.id, patch: { higgsfieldMediaId: answer.personMediaId } }));
  }
  await setLook({ deps, id: look.id, patch: { prompt: answer.prompt || null, jobId: answer.jobId } });
  if (!answer.ok || !answer.resultUrl) return failLook({ deps, id: look.id, error: answer.error ?? "No result image." });

  await setLook({ deps, id: look.id, patch: { step: "Downloading the result" } });
  const bytes = await download({ url: answer.resultUrl, referer: "" });
  if (!bytes.ok) return failLook({ deps, id: look.id, error: bytes.error });
  const saved = await saveImage({ bytes: bytes.value, mediaDir: deps.paths.media, file: `looks/${look.id}.jpg`, maxPixels: 16_000_000 });
  if (!saved.ok) return failLook({ deps, id: look.id, error: saved.error });
  await setLook({ deps, id: look.id, patch: { status: "done", step: null, result: saved.value, error: null, finishedAt: new Date().toISOString() } });
};

export type RunLookInput = { deps: Deps; look: Look };

export const runLook = (input: RunLookInput): void =>
  generationQueue(async (): Promise<void> => {
    try {
      await generate(input);
    } catch (error) {
      await failLook({ deps: input.deps, id: input.look.id, error: message(error) });
    }
  });
