import { Service, ServiceFactory, Services } from "@/global.types";

class ServiceProxyHandler<T extends Services, S extends Service> implements ProxyHandler<S> {
	constructor(private readonly container: T, private readonly factory: ServiceFactory<T, S>) {}

	get<K extends keyof S>(target: S, name: string) {
		return new Proxy(this.factory, new MethodProxyHandler(this.container, name as K));
	}
}

class MethodProxyHandler<T extends Services, S extends Service> implements ProxyHandler<ServiceFactory<T, S>> {
	constructor(private readonly container: T, private readonly name: keyof S) {}

	async apply(target: ServiceFactory<T, S>, proxy: S, parameters: unknown[]) {
		const instance = await target(this.container);
		const method = instance[this.name];
		if (typeof method === "function") {
			return method.apply(instance, parameters);
		}
		throw new Error(`Member '${this.name}' is not a function (${typeof method})`);
	}
}

export function service<T extends Services, S extends Service>(container: T, factory: ServiceFactory<T, S>): S {
	const service = {} as S;
	return new Proxy(service, new ServiceProxyHandler(container, factory));
}
