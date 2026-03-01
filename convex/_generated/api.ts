/* eslint-disable */
// @ts-nocheck
/**
 * Stub — replaced by `npx convex dev` output.
 */

// We use a Proxy so any api.xxx.yyy access works without errors at runtime.
function makeApiProxy(path: string[] = []): any {
  return new Proxy(
    {},
    {
      get(_: unknown, prop: string) {
        return makeApiProxy([...path, prop]);
      },
    }
  );
}

export const api: any = makeApiProxy();
export const internal: any = makeApiProxy();
