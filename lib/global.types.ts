import type { MaybePromise } from "@diba1013/types";

// This is necessary for types to work, to ensure that this is of type Object
// Record<string, unknown> or simply unknown does not suffice as it does not capture interfaces.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Injectable = {};

export type Services = {
	// Only allow strings here to be more predictable.
	[Key in string]: Injectable | Services;
};

/**
 *
 */
export type Scope<Container extends Services> = {
	[Key in ScopeKey<Container>]: ScopeMethod<Container, Key>;
};

/**
 * Ensures that all values are wrapped as asynchronous functions.
 * For dynamic services, the method declaration is proxied while static services are wrapped
 * Furthermore, the return values are unwrapped to not nest potential promises within each other.
 */
export type ScopeMethod<
	Container extends Services,
	Key extends ScopeKey<Container>,
	Inject = Container[Key],
> = Inject extends (...parameters: infer Parameters) => infer Result
	? (...parameters: Parameters) => Promise<Awaited<Result>>
	: () => Promise<Awaited<Inject>>;

export type ScopeKey<Container extends Services> = Extract<keyof Container, string>;
export type ScopeValue<Container extends Services, Key extends ScopeKey<Container>, Inject = Container[Key]> =
	// This is used to capture any parameter value as function.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Inject extends (...parameters: any) => infer Result ? Awaited<Result> : Inject;

/**
 *
 */
export type ScopeContext<Container extends Services, Key extends ScopeKey<Container>, Inject = Container[Key]> =
	// This is used to capture any result value as function.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Inject extends (...parameters: infer Parameters) => any ? Parameters : never;

/**
 * A wrapper factory to construct the injectable.
 */
export type InjectableFactory<Context extends unknown[], Result> = (...context: Context) => MaybePromise<Result>;

/**
 * The decorator is used to provide the arguments (i.e. context) for the factory and to control the invocation of the factory.
 *
 * @see {@link InjectableContext}
 */
export interface InjectableDecorator<Context extends unknown[], Result> {
	invoke(factory: InjectableFactory<Context, Result>): Promise<Result>;
}

/**
 *
 */
export type InjectableContext<Container extends Services, Key extends ScopeKey<Container>> = {
	/**
	 * The injectable name that is resolved from the parent injection container.
	 */
	key: Key;
	/**
	 * The resolved injectable container that provides direct access to simple services.
	 * The container can only contain initialize static values, not dynamic values that require context via a factory.
	 */
	container: OmitProxiedInjectableFactories<Container>;
	/**
	 * The current scope that is resolved within this function.
	 * This allows to asynchronously refer to other services within this container during initialization.
	 */
	scope: Scope<Container>;
	/**
	 * This instance controls the invocation of the factory and provides a high level wrapper for certain features.
	 */
	decorator: InjectableDecorator<ScopeContext<Container, Key>, ScopeValue<Container, Key>>;
};

export type OmitProxiedInjectableFactories<Container extends Services> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Key in ScopeKey<Container> as Container[Key] extends (...parameters: any) => any ? never : Key]: Container[Key];
};

/**
 *
 */
export type Crate<Container extends Services> = {
	// TODO: To be safe, this should probably return a decorated value to enforce the use of the decorator.
	[Key in ScopeKey<Container>]: InjectableProvider<Container, Key>;
};

/**
 *
 */
export type InjectableProvider<Container extends Services, Key extends ScopeKey<Container>> = (
	context: InjectableContext<Container, Key>,
) => MaybePromise<ScopeValue<Container, Key>>;

export type GlobalInjectableContext<Container extends Services, Context extends unknown[], Result> = {
	container: OmitProxiedInjectableFactories<Container>;
	scope: Scope<Container>;
	decorator: InjectableDecorator<Context, Result>;
};

export type GlobalInjectableProvider<Container extends Services, Context extends unknown[], Result> = (
	context: GlobalInjectableContext<Container, Context, Result>,
) => MaybePromise<Result>;
