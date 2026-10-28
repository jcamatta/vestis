export type Ok<T> = { ok: true; value: T };
export type Fail = { ok: false; error: string };
export type Result<T> = Ok<T> | Fail;
