import { AsyncLocalStorage } from "node:async_hooks";

const authStorage = new AsyncLocalStorage<string | undefined>();

export function runWithAuthHeader<T>(authHeader: string | undefined, fn: () => T): T {
  return authStorage.run(authHeader, fn);
}

export function currentAuthHeader(): string | undefined {
  return authStorage.getStore();
}
