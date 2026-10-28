type WithId = { id: string };

export type UpdateByIdInput<T extends WithId> = { list: T[]; id: string; patch: (item: T) => T };

export const updateById = <T extends WithId>(input: UpdateByIdInput<T>): T[] =>
  input.list.map((item: T): T => (item.id === input.id ? input.patch(item) : item));

export type RemoveByIdInput<T extends WithId> = { list: T[]; id: string };

export const removeById = <T extends WithId>(input: RemoveByIdInput<T>): T[] =>
  input.list.filter((item: T): boolean => item.id !== input.id);

export type FindByIdInput<T extends WithId> = { list: T[]; id: string };

export const findById = <T extends WithId>(input: FindByIdInput<T>): T | undefined =>
  input.list.find((item: T): boolean => item.id === input.id);
