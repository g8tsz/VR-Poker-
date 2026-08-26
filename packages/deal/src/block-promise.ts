/** Block the event loop until a promise settles (deal audit must complete before dealing). */
export function blockOn<T>(promise: Promise<T>): T {
  const slot = new Int32Array(new SharedArrayBuffer(4));
  let result: T;
  let error: unknown;
  void promise.then(
    (value) => {
      result = value;
      Atomics.store(slot, 0, 1);
      Atomics.notify(slot, 0);
    },
    (err) => {
      error = err;
      Atomics.store(slot, 0, 2);
      Atomics.notify(slot, 0);
    },
  );
  Atomics.wait(slot, 0, 0);
  if (error) throw error;
  return result!;
}
