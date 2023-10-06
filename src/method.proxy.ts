import { Service } from "@/global.types";

export type MethodProvider<S extends Service, K extends keyof S> = () => Promise<{
	name: K;
	method: S[K];
	instance: S;
}>;

class MethodProxyHandler<S extends Service, K extends keyof S> implements ProxyHandler<MethodProvider<S, K>> {
	async apply(target: MethodProvider<S, K>, proxy: S, parameters: unknown[]) {
		const { instance, name, method } = await target();
		if (typeof method !== "function") {
			throw new TypeError(`Method '${String(name)}' is not a function (${typeof method})`);
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
		return method.apply(instance, parameters);
	}
}

export function method<S extends Service, K extends keyof S>(factory: MethodProvider<S, K>): MethodProvider<S, K> {
	return new Proxy(factory, new MethodProxyHandler());
}
