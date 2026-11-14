import type { Task } from './ports/IBackendApi.ts';

/** Puts a just-created task first, replacing any copy with the same id (no duplicates). */
export function withNewTask(current: Task[] | undefined, created: Task): Task[] {
  return [created, ...(current ?? []).filter((t) => t.id !== created.id)];
}
