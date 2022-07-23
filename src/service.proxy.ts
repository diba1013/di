import { Service, ServiceFactory, Services } from "@/global.types";
import { method } from "@/method.proxy";

const INSTANCE = Symbol.for("di:service:instance");

type CachedServiceInstance<S extends Service> = S & {
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
		return method(async () => {
			if (target[INSTANCE] === undefined) {
				target[INSTANCE] = await this.$factory(this.$container);
			}
			const instance = target[INSTANCE];
			const method = instance[name as K];
			if (typeof method === "function") {
				return {
					name: name as K,
					instance,
					method,
				};
			}
			throw new Error(`Member '${String(name)}' is not a function (${typeof method})`);
		});
	}
}

export function service<T extends Services, S extends Service>(container: T, factory: ServiceFactory<T, S>): S {
	const service = {} as CachedServiceInstance<S>;
	return new Proxy(service, new ServiceProxyHandler(container, factory));
}
