export type Task = () => Promise<void>;
export type Enqueue = (task: Task) => void;

/** Runs tasks with at most `concurrency` at a time; a failing task never stops the queue. */
export const createQueue = (concurrency: number): Enqueue => {
  const waiting: Task[] = [];
  let running = 0;
  const next = (): void => {
    if (running >= concurrency) return;
    const task = waiting.shift();
    if (!task) return;
    running += 1;
    task()
      .catch((error: unknown): void => console.error("Task failed:", error))
      .finally((): void => {
        running -= 1;
        next();
      });
  };
  return (task: Task): void => {
    waiting.push(task);
    next();
  };
};
