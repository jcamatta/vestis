import type { Extraction, LensItem, LookItem, Look, ModelOption, Person, Wardrobe } from '../data/wardrobe';
import type { Setup } from '../data/setup';
import type { Slot } from '../data/slot';

const errorOf = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
};

type RequestInput = { path: string; method?: string; body?: BodyInit; contentType?: string; signal?: AbortSignal };

const request = async (input: RequestInput): Promise<Response> => {
  const response = await fetch(input.path, {
    method: input.method ?? 'GET',
    body: input.body,
    signal: input.signal,
    headers: input.contentType ? { 'Content-Type': input.contentType } : undefined,
  });
  if (!response.ok) throw new Error(await errorOf(response));
  return response;
};

export const fetchWardrobe = async (signal: AbortSignal): Promise<Wardrobe> =>
  (await (await request({ path: '/api/wardrobe', signal })).json()) as Wardrobe;

export const fetchModels = async (signal: AbortSignal): Promise<ModelOption[]> =>
  (await (await request({ path: '/api/models', signal })).json()) as ModelOption[];

export type CreateLookInput = { personId: string; model: string; items: LookItem[] };

export const createLook = async (input: CreateLookInput): Promise<Look> =>
  (await (await request({ path: '/api/looks', method: 'POST', body: JSON.stringify(input), contentType: 'application/json' })).json()) as Look;

export const uploadPerson = async (file: File): Promise<Person> =>
  (await (
    await request({
      path: `/api/people?name=${encodeURIComponent(file.name.replace(/\.[^.]+$/, ''))}`,
      method: 'POST',
      body: file,
      contentType: file.type.startsWith('image/') ? file.type : 'image/jpeg',
    })
  ).json()) as Person;

export const uploadOutfit = async (file: File): Promise<Extraction> =>
  (await (
    await request({
      path: `/api/extractions?name=${encodeURIComponent(file.name.replace(/\.[^.]+$/, ''))}`,
      method: 'POST',
      body: file,
      contentType: file.type.startsWith('image/') ? file.type : 'image/jpeg',
    })
  ).json()) as Extraction;

export type SelectItemsInput = { id: string; selected: number[] };

export const selectItems = async (input: SelectItemsInput): Promise<void> => {
  await request({ path: `/api/extractions/${input.id}`, method: 'PATCH', body: JSON.stringify({ selected: input.selected }), contentType: 'application/json' });
};

/** Spends credits. */
export const runExtraction = async (id: string): Promise<void> => {
  await request({ path: `/api/extractions/${id}/run`, method: 'POST' });
};

export type FindShopsInput = { id: string; indexes?: number[] };

/** Marks the items as searching (all extracted ones when no indexes) and returns their cut-outs to open in Google Lens. */
export const findShops = async (input: FindShopsInput): Promise<LensItem[]> => {
  const response = await request({ path: `/api/extractions/${input.id}/shop`, method: 'POST', body: JSON.stringify({ indexes: input.indexes }), contentType: 'application/json' });
  return ((await response.json()) as { items: LensItem[] }).items;
};

export type EntityKind = 'garments' | 'people' | 'looks' | 'extractions';
export type EntityRef = { kind: EntityKind; id: string };

export const deleteEntity = async (input: EntityRef): Promise<void> => {
  await request({ path: `/api/${input.kind}/${input.id}`, method: 'DELETE' });
};

export const retryAnalysis = async (input: EntityRef): Promise<void> => {
  await request({ path: `/api/${input.kind}/${input.id}/retry`, method: 'POST' });
};

export type MoveGarmentInput = { id: string; slot: Slot };

export const moveGarment = async (input: MoveGarmentInput): Promise<void> => {
  await request({ path: `/api/garments/${input.id}`, method: 'PATCH', body: JSON.stringify({ slot: input.slot }), contentType: 'application/json' });
};

/** The server's last check of Claude and Higgsfield (redone there after five minutes). */
export const fetchSetup = async (signal: AbortSignal): Promise<Setup> =>
  (await (await request({ path: '/api/setup', signal })).json()) as Setup;

/** Checks Claude and Higgsfield now. */
export const checkSetup = async (): Promise<Setup> =>
  (await (await request({ path: '/api/setup/check', method: 'POST' })).json()) as Setup;
