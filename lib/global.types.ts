import type { MaybePromise } from "@diba1013/types";

// This is necessary for types to work, to ensure that this is of type Object
// Record<string, unknown> or simply unknown does not suffice as it does not capture interfaces.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Injectable = {};

/**
 * A wrapper factory to construct the injectable.
 * This method can be synchronous or asynchronous and may return an instance of the injectable or a promise resolving to it.
 */
export type InjectableFactory<Parameters extends unknown[], Result> = (...context: Parameters) => MaybePromise<Result>;

/**
 * Declares a named mapping between a (nested) service name and its injectable value.
 *
 * The reason on why it only accepts string is to ensure type-safety and not allow symbols as keys as they would merge into one type.
 */
export type Services = {
	[Key in string]: Injectable | InjectableFactory<unknown[], Injectable> | Services;
};

/**
 * Extracts the string keys from the given container.
 * This is done to limit the actual inference to strings, as otherwise it would capture all type of keys (including symbols).
 *
 * The reason on why it only accepts string is to ensure type-safety and not allow symbols as keys as they would merge into one type.
 */
export type ScopeKey<Container extends Services> = Extract<keyof Container, string>;

/**
 * Manages a initialization function of a container, which maps direct keys to the corresponding initialization factory.
 * This is usually done via a proxy object, thus the methods are lazily invoked and delegate the work to the respective construction factory.
 * This way, the invoker does not need to know how to initialize the container, but only to provide the necessary context for the construction factory.
 */
export type Scope<Container extends Services> = {
	[Key in ScopeKey<Container>]: NormalizedScopeInjectableFactory<Container[Key]>;
};

/**
 * Wraps the injectable as an async function that returns a promise resolving to the injectable.
 * If the injectable is a {@link InjectableFactory}, the factory will be unwrapped and normalized to return a promise.
 * Otherwise, the injectable itself is wrapped to return a promise resolving to it.
 */
export type NormalizedScopeInjectableFactory<Inject> =
	Inject extends InjectableFactory<infer Parameters, infer Result>
		? (...parameters: Parameters) => Promise<Awaited<Result>>
		: () => Promise<Awaited<Inject>>;

/**
 * Extracts the return value of a specific injectable.
 * If the injectable is a factory function, its return value will be extracted.
 * Otherwise, the injectable itself is returned.
 */
export type KeyedScopeFactoryReturnValue<Inject> =
	// This is used to capture any parameter value as function.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Inject extends InjectableFactory<any, infer Result> ? Awaited<Result> : Inject;

/**
 * Extracts the parameters of a specific injectable.
 * If the injectable is a factory function, its parameter value will be extracted.
 * Otherwise, an empty tuple will be returned as there are no parameters.
 */
export type KeyedScopeFactoryParameters<Inject> =
	// This is used to capture any result value as function.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Inject extends InjectableFactory<infer Parameters, any> ? Parameters : never[];

/**
 * Ensures that only raw injectables are present within the container, since those can be instantiated without knowing the dynamic parameters.
 * Dynamic injectable factories must be invoked manually through the {@link Scope} dynamically.
 */
export type OmitProxiedInjectableFactories<Container extends Services> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Key in ScopeKey<Container> as Container[Key] extends InjectableFactory<any, any> ? never : Key]: Container[Key];
};

/**
 * The decorator serves multiple purposes, but is essentially responsible for constructing the injectable value.
 *   1. Control when / how to construct the injectable value (e.g. wait for dependencies to be initialized).
 *   3. Add additional context to the injectable value so that the scope can behave accordingly.
 */
export interface InjectableDecorator<Parameters extends unknown[], Result> {
	invoke(factory: InjectableFactory<Parameters, Result>): Promise<Result>;
}

/**
 * The injectable context provides the necessary information for the injection process.
 */
export type InjectableContext<Container extends Services, Key, Parameters extends unknown[], Result> = {
	/**
	 * The injectable name that is resolved from the parent injection container.
	 */
	key: Key;
	/**
	 * The resolved injectable container that provides direct access to simple services.
	 *   1. The container can only initialize static values, not dynamic values that require context via a factory.
	 *   2. The resolved values must be accessed between initialization and invoking the decorated factory.
	 *   3. Therefore, they cannot be accessed within the decorated factory. For this, use the `scope` property instead.
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
	decorator: InjectableDecorator<Parameters, Result>;
};

/**
 * An injectable provider is responsible for resolving an injectable within the scope.
 * Therefore, it provides the {@link InjectableContext} and returns the resolved injectable via {@link InjectableDecorator}.
 *
 * The following steps need to be performed within the provider:
 *   1. Resolve all dependencies within the container / scope.
 *   2. Create a decorated factory function that utilizes this information to construct the injectable.
 */
// TODO: To be safe, this should probably return a decorated value to enforce the use of the decorator.
export type InjectableProvider<Container extends Services, Key, Parameters extends unknown[], Result> = (
	context: InjectableContext<Container, Key, Parameters, Result>,
) => MaybePromise<Result>;

/**
 * This object maps service names to their respective injectable providers.
 * A {@link InjectableProvider} is essentially a blueprint of how a service is constructed.
 */
export type Crate<Container extends Services> = {
	[Key in ScopeKey<Container>]: InjectableProvider<
		Container,
		Key,
		KeyedScopeFactoryParameters<Container[Key]>,
		KeyedScopeFactoryReturnValue<Container[Key]>
	>;
};

/**
 * This object maps service names to their respective injectable providers.
 */
export type ScopeProvider<Container extends Services> = {
	/**
	 * Returns the scope for this provider. This is instantiated once and re-used between invocations.
	 *
	 * @returns The scope.
	 */
	scope(): Scope<Services>;

	/**
	 * Resolves a value from the scope. This uses the same factory as the injectable provider.
	 * Thus it allows for easy instantiation of multiple injectables.
	 *
	 * General use cases are:
	 *   1. Automatically instantiate and return multiple objects without having to all await (through the container).
	 *   2. Instantiate a wrapper instance that makes use of the services, but does not belong into the global scope.
	 *
	 * @param factory The factory to resolve.
	 *
	 * @returns The resolved value.
	 */
	resolve<Result>(factory: InjectableProvider<Container, undefined, never[], Result>): Promise<Result>;
};
