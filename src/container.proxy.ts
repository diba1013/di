import { decorator } from "@/proxy.decorator";
import { Container, ContainerEntry, ContainerKey, Crate, Services } from "@/global.types";

class ContainerProxyHandler<T extends Services> implements ProxyHandler<Container<T>> {
	private readonly $crate: Crate<T>;

	constructor(crate: Crate<T>) {
		this.$crate = crate;
	}

	get<K extends ContainerKey<T>>(target: T, key: string, receiver: T): ContainerEntry<T, K> {
		const cached = target[key as K];
		if (cached !== undefined) {
			return cached;
		}
		const factory = this.$crate[key as K];
		if (factory !== undefined) {
			const injectable = factory({
				container: receiver,
				decorator: decorator(receiver),
			});
			target[key as K] = injectable;
			return injectable;
		}
		throw new Error(`Injectable '${key}' has not been registered or is invalid`);
	}
}

export function container<T extends Services>(crate: Crate<T>): Container<T> {
	const proxy = {} as Container<T>;
	return new Proxy(proxy, new ContainerProxyHandler<T>(crate));
}
