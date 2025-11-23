import type {
	Crate,
	InjectableDecorator,
	InjectableFactory,
	InjectableProvider,
	KeyedScopeFactoryParameters,
	KeyedScopeFactoryReturnValue,
	Scope,
	ScopeKey,
	ScopeProvider,
	Services,
} from "~/global.types";

/**
 * Creates a scope from a crate.
 * While this provides low-level access to the scope, it is recommended to use the {@link create} function instead.
 *
 * @param crate The crate to create a scope from.
 * @returns A scope.
 */
export function inject<Container extends Services>(crate: Crate<Container>): Scope<Container> {
	const cache = new Map<string, unknown>();

	// Lazily invoke the initialization factories when the method is called.
	// We could do some pre-processing here like detecting dependencies or transforming the decorator functions.
	// However, this would incur some initialization overhead and introduce some more complex error handling.
	// With this, the error handling as well as any async initialization is completely off-loaded to the scope functions.
	return new Proxy({} as Scope<Container>, {
		get: <Key extends ScopeKey<Container>>(
			target: Scope<Container>,
			parameter: string | symbol,
			receiver: Scope<Container>,
		) => {
			const key = parameter as Key;
			// Resolve a promised based invocation with the proxy instance as we do not need to wait here.
			// This is the case if someone calls await on this function or the return in some way.
			if (key === "then") {
				// We ideally want to return the receiver, since we want essentially ignore the erroneous await.
				// Though the return value expects a function that would then need to return the receiver.
				// However this would leads to a infinite recursion, due to the Promise.resolve trying to recursively resolve `then` again.
				// Due to a quirk (or possibly intended behavior), it does not matter what we return here as actual value (it needs to be an object, not a function).
				// We break this by returning an already resolved promise, which then falls back to the proxy object.
				// The tests should capture if this changes.
				// FIXME: This might be a optimization from the V8 engine, but could also be an (undocumented) behaviour of promises and/or proxies.
				return Promise.resolve();
			}
			// Return a method to allow service instantiation.
			// Since this is within a proxy, checking for a correct type match does not really offset the complexity.
			// The spread operator captures all arguments that the function was called with.
			return async (...context: KeyedScopeFactoryParameters<Container[Key]>) => {
				// TODO: Ideally the decorator handles the id creation and return it or manually invoke a cache wrapper.
				const id = `${key}:${JSON.stringify({ context })}`;
				const cached = cache.get(id);
				if (cached) {
					return cached;
				}

				const instance = await instantiate(
					receiver,
					context,
					async ({ decorator, container, scope }): Promise<KeyedScopeFactoryReturnValue<Container[Key]>> => {
						// We just assume that the key actually resolves to any factory.
						// Therefore we should at least return undefined in case it is not.
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
						return await crate[key]?.({
							key,
							container,
							scope,
							decorator,
						});
					},
				);
				cache.set(id, instance);
				return instance;
			};
		},
	});
}

/**
 * Creates a scope provider from a crate.
 * This provides some high-level wrapper for to operate on a scope.
 *
 * @example
 * ```ts
 * const scope = create({
 * 	// your factory functions.
 * });
 *
 * const instance = await scope.resolve(({decorator}) => {
 * 	return decorator.invoke(() => {
 * 		// your factory function.
 * 	});
 * })
 * ```
 *
 *
 * @param crate The crate to create a scope provider from.
 * @returns A scope provider.
 */
export function create<Container extends Services>(crate: Crate<Container>): ScopeProvider<Container> {
	const scope = inject(crate);

	return {
		scope: (): Scope<Container> => {
			return scope;
		},

		resolve: async <Result>(
			factory: InjectableProvider<Container, undefined, never[], Result>,
		): Promise<Result> => {
			return await instantiate(scope, [], factory);
		},
	};
}

const EMPTY_PROXY = new Proxy(
	{},
	{
		get: (target, property, receiver) => {
			// This is the whole concept of this proxy, returning itself infinitely to allow for destructuring.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return receiver;
		},
	},
);

type SnoopingContainer<Container extends Services> = Container & ((scope: Scope<Container>) => Promise<Container>);

function reduce<Container extends Services>(): SnoopingContainer<Container> {
	const services = new Set<ScopeKey<Container>>();

	// Initialize all the services that were seen up to this point.
	// This method is called via proxy.apply below on demand.
	const fork = async (scope: Scope<Container>): Promise<Container> => {
		const keys = services.keys();
		// Collect all resolved services to a new resolved object.
		return Object.fromEntries(
			await Promise.all(
				keys.map(async (service) => {
					// Use the scope to not have to worry about how the initialization is actually done.
					// We do not have any context here to resolve the services with, as only static factories should be invoked here.
					return [service, await scope[service]()];
				}),
			),
		) as Container;
	};

	// All direct property access attempts are recorded here.
	// The scoped container is constructed once the target method is actually called.
	return new Proxy(fork as SnoopingContainer<Container>, {
		// Address the missing container properties.
		get: (_target, property) => {
			services.add(property as ScopeKey<Container>);
			// Mimic further property access for common usage.
			return EMPTY_PROXY;
		},
	});
}

function NoopDecorator<Result>(): InjectableDecorator<never, Result> {
	return {
		// Satisfies interface.
		// eslint-disable-next-line @typescript-eslint/require-await
		invoke: async (): Promise<Result> => {
			// This result should never be used as this decorator is only responsible for capturing dependencies.
			// But we cannot throw an error here as we actually need this invocation to happen.
			return undefined as unknown as Result;
		},
	};
}

function Decorator<Context extends unknown[], Inject>(context: Context): InjectableDecorator<Context, Inject> {
	return {
		invoke: async (factory: InjectableFactory<Context, Inject>): Promise<Inject> => {
			// Pass the all arguments (plural) to the factory, ensuring that they are properly proxied.
			return await factory(...context);
		},
	};
}

async function instantiate<Container extends Services, Context extends unknown[], Result>(
	scope: Scope<Container>,
	context: Context,
	factory: InjectableProvider<Container, undefined, Context, Result>,
): Promise<Result> {
	const fork = reduce<Container>();

	// Invoke factory to detect all services used within the initialization.
	await factory({
		key: undefined,
		container: fork,
		decorator: NoopDecorator(),
		scope,
	});

	// Now that we know all services used, instantiate the object with a new scope.
	const forked = await fork(scope);

	// Invoke factory again to actually construct the injectable.
	return await factory({
		key: undefined,
		container: forked,
		decorator: Decorator(context),
		scope,
	});
}
