const queues: Map<string, Promise<void>> = new Map();

export function enqueue(key: string, task: () => Promise<void> | void): void {
  if (!queues.has(key)) {
    queues.set(key, Promise.resolve());
  }

  const queue = queues.get(key)!;

  const newQueue = queue
    .then(async () => {
      await task();
    })
    .catch((err) => {
      console.error('Queue task failed:', err);
    });

  queues.set(key, newQueue);

  // Optional: cleanup after last task finishes
  void newQueue.finally(() => {
    if (queues.get(key) === newQueue) {
      queues.delete(key);
    }
  });
}
