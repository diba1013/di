import { Service, ServiceFactory, Services } from "@/global.types";

const INSTANCE = Symbol.for("di:service:instance");

type CachedServiceInstance<S> = S & {
	[INSTANCE]?: S;
};

class ServiceProxyHandler<T extends Services, S extends Service> implements ProxyHandler<CachedServiceInstance<S>> {
	private readonly $container: T;
	private readonly $factory: ServiceFactory<T, S>;

	constructor(container: T, factory: ServiceFactory<T, S>) {
		this.$container = container;
		this.$factory = factory;
	}

	get<K extends keyof S>(target: CachedServiceInstance<S>, name: string) {
		const factory: ServiceFactory<T, S> = async (container: T): Promise<S> => {
			const cached = target[INSTANCE];
			if (cached !== undefined) {
				return cached;
			} else {
				const instance = await this.$factory(container);
				target[INSTANCE] = instance;
				return instance;
			}
		};
		return new Proxy(factory, new MethodProxyHandler(this.$container, name as K));
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
		throw new Error(`Member '${String(this.name)}' is not a function (${typeof method})`);
	}
}

export function service<T extends Services, S extends Service>(container: T, factory: ServiceFactory<T, S>): S {
	const service = {} as CachedServiceInstance<S>;
	return new Proxy(service, new ServiceProxyHandler(container, factory));
}
