import {
	Constant,
	ConstantFactory,
	Crate,
	Injectable,
	InjectableDecorator,
	InjectableFactory,
	Service,
	ServiceConstructor,
	ServiceFactory,
	Services,
} from "@/global.types";
import { service } from "@/service.proxy";
import { container } from "@/container.proxy";

class ProxiedInjectableDecorator<T extends Service, I extends Injectable> implements InjectableDecorator<T, I> {
	constructor(private readonly container: T) {}

	raw(factory: InjectableFactory<T, I>): I {
		return factory(this.container);
	}

	constant<C extends I & Constant>(factory: ConstantFactory<T, C>): C {
		return factory(this.container);
	}

	service<S extends I & Service>(constructor: ServiceConstructor<T, S>): S {
		return this.factory((container: T) => {
			return new constructor(container);
		});
	}

	factory<S extends I & Service>(factory: ServiceFactory<T, S>): S {
		return service(this.container, factory);
	}

	nest<S extends I & Services>(services: Crate<S>): S {
		return container(services);
	}
}

export function decorator<T extends Services, I extends Injectable>(container: T): InjectableDecorator<T, I> {
	return new ProxiedInjectableDecorator(container);
}
