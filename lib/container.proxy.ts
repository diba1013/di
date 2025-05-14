import type {
	Crate,
	InjectableDecorator,
	InjectableFactory,
	Scope,
	ScopeContext,
	ScopeKey,
	ScopeValue,
	Services,
} from "~/global.types";

export function inject<Container extends Services>(crate: Crate<Container>): Scope<Container> {
	const cache = new Map<string, unknown>();

	// Lazily invoke the initialization factories when the method is called.
	// We could do some pre-processing here like detecting dependencies or transforming the decorator functions.
	// However, this would incur some initialization overhead and introduce some more complex error handling.
	// With this, the error handling as well as any async initialization is completely off-loaded to the scope functions.
	return new Proxy({} as Scope<Container>, {
		get: <Key extends ScopeKey<Container>>(
			target: Scope<Container>,
			key: string | symbol,
			receiver: Scope<Container>,
		) => {
			// Resolve a promised based invocation with the proxy instance as we do not need to wait here.
			// This is the case if someone calls await on this function or the return in some way.
			if (key === "then") {
				return receiver;
			}
			// Return a method to allow service instantiation.
			// Since this is within a proxy, checking for a correct type match does not really offset the complexity.
			// The spread operator captures all arguments that the function was called with.
			return async (...context: ScopeContext<Container, Key>) => {
				// TODO: Ideally the decorator handles the id creation and return it or manually invoke a cache wrapper.
				const id = `${key as Key}:${JSON.stringify({ context })}`;
				const cached = cache.get(id);
				if (cached) {
					return cached;
				}
				const instance = await invoke(crate, key as Key, receiver, context);
				cache.set(id, instance);
				return instance;
			};
		},
	});
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

function NoopDecorator<
	Container extends Services,
	Key extends ScopeKey<Container>,
	Inject = ScopeValue<Container, Key>,
>(): InjectableDecorator<never, Inject> {
	return {
		// Satisfies interface.
		// eslint-disable-next-line @typescript-eslint/require-await
		invoke: async (): Promise<Inject> => {
			// This result should never be used as this decorator is only responsible for capturing dependencies.
			// But we cannot throw an error here as we actually need this invocation to happen.
			return undefined as unknown as Inject;
		},
	};
}

function Decorator<
	Container extends Services,
	Key extends ScopeKey<Container>,
	Context extends ScopeContext<Container, Key> = ScopeContext<Container, Key>,
	Inject = ScopeValue<Container, Key>,
>(context: Context): InjectableDecorator<Context, Inject> {
	return {
		invoke: async (factory: InjectableFactory<Context, Inject>): Promise<Inject> => {
			// Pass the all arguments (plural) to the factory, ensuring that they are properly proxied.
			return await factory(...context);
		},
	};
}

async function invoke<Container extends Services, Key extends ScopeKey<Container>>(
	crate: Crate<Container>,
	key: Key,
	scope: Scope<Container>,
	context: ScopeContext<Container, Key>,
): Promise<ScopeValue<Container, Key>> {
	const target = crate[key];

	// Snoop which services need to be resolved by invoking with a dummy container.
	const fork = reduce<Container>();
	// The decorator ensures that the service factory is ignored and not invoked during this first call.
	await target({
		container: fork,
		key,
		decorator: NoopDecorator<Container, Key>(),
		scope,
	});
	// Perform service initialization with the root container.
	// This must not necessarily be a fully resolved container as it will only use the captured keys from the first initialization.
	const forked: Container = await fork(scope);
	// Call actual methods with resolved container.
	const resolved = await target({
		container: forked,
		scope,
		key,
		decorator: Decorator<Container, Key>(context),
	});
	return resolved;
}
