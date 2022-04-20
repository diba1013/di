export type MaybePromise<T> = T | Promise<T>;

export type Constructor<T> = new (...parameters: unknown[]) => T;

export type Objects = Record<string, unknown>;
export type ObjectFactory<T extends Objects> = () => T;

export type Functions<T = unknown> = (...parameters: unknown[]) => T;
