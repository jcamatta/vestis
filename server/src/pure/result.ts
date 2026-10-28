import type { Fail, Ok } from "../data/result.js";

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const fail = (error: string): Fail => ({ ok: false, error });
