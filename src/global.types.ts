export type MaybePromise<T> = T | PromiseLike<T> | Promise<T>;

export type Primitive = string | symbol | number;
export type Primitives = {
	[K: string]: Primitive | Primitives;
};
export type Constant = Primitive | Primitives;

// This is necessary for types to work, to ensure that this is of type Object
// Record<string, unknown> or simply unknown does not suffice as it does not caputure interfaces
// eslint-disable-next-line @typescript-eslint/ban-types
export type Service = {};

export type Injectable = Constant | Service;

export type Services = {
	[K in string]: Injectable | Services;
};

export type InjectableFactory<T extends Services, I extends Injectable> = (container: Container<T>) => I;

export type ConstantFactory<T extends Services, I extends Constant> = InjectableFactory<T, I>;

export type ServiceConstructor<T extends Services, I extends Service> = new (container: Container<T>) => I;

export type ServiceFactory<T extends Services, I extends Service> = (container: Container<T>) => MaybePromise<I>;

export interface InjectableDecorator<T extends Services, I extends Injectable | Services> {
	raw(factory: InjectableFactory<T, I>): I;

	constant<C extends I & Constant>(factory: ConstantFactory<T, C>): C;

	service<S extends I & Service>(constructor: ServiceConstructor<T, S>): S;

	factory<S extends I & Service>(factory: ServiceFactory<T, S>): S;

	nest<S extends I & Services>(services: Crate<S>): S;
}

export type InjectableContext<T extends Services, I extends Injectable> = {
	container: Container<T>;
	decorator: InjectableDecorator<T, I>;
};

export type InjectableProvider<T extends Services, I extends Injectable> = (context: InjectableContext<T, I>) => I;

export type Crate<T extends Services> = {
	[K in ContainerKey<T>]: InjectableProvider<T, ContainerEntry<T, K>>;
};

export type Container<T extends Services> = {
	[K in ContainerKey<T>]: ContainerEntry<T, K>;
};

export type ContainerKey<T extends Services> = keyof T;
export type ContainerEntry<T extends Services, K extends ContainerKey<T>> = T[K];
