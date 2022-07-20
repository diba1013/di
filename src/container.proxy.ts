import { decorator } from "@/proxy.decorator";
import {
	Container,
	ContainerEntry,
	ContainerFactory,
	ContainerKey,
	InjectableProvider,
	Service,
	Services,
} from "@/global.types";

class ContainerProxyHandler<T extends Services, K extends ContainerKey<T>> implements ProxyHandler<Container<T>> {
	private readonly $factory: InjectableProvider<T, K>;

	constructor(factory: InjectableProvider<T, K>) {
		this.$factory = factory;
	}

	get(target: Container<T>, key: string, receiver: Container<T>): ContainerEntry<T, K> {
		const cached = target[key as K];
		if (cached !== undefined) {
			return cached;
		}
		const injectable = this.$factory({
			key: key as K,
			container: receiver,
			decorator: decorator(receiver),
		});
		// cache injectable
		target[key as K] = injectable;
		return injectable;
	}
}

export function container<T extends Service, K extends ContainerKey<T> = ContainerKey<T>>(
	factory: ContainerFactory<T, K>,
): Container<T> {
	const provider: InjectableProvider<T, K> = (context) => {
		if (typeof factory === "function") {
			return factory(context);
		} else {
			const provider = factory[context.key];
			if (provider === undefined) {
				throw new Error(`Injectable '${String(context.key)}' has not been registered or is invalid`);
			}
			return provider(context);
		}
	};
	const proxy = {} as Container<T>;
	return new Proxy(proxy, new ContainerProxyHandler<T, K>(provider));
}
