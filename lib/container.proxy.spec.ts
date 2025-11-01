import type { InjectableFactory, InjectableProvider } from "~/global.types";
import { inject } from "~/container.proxy";
import { expect, it, vi } from "vitest";

it("inject should call decorated function for context retrieval without calling factory", async () => {
	type ServiceProvider = {
		fork: string;
	};

	const factory = vi.fn<InjectableFactory<never, string>>();
	factory.mockResolvedValue("42");

	const decorated = vi.fn<InjectableProvider<ServiceProvider, "fork">>(({ decorator }) => {
		return decorator.invoke(factory);
	});

	const cut = inject<ServiceProvider>({
		fork: decorated,
	});

	const result = await cut.fork();

	expect(result).to.eq("42");
	// Resolve 1 for context, Resolve 2 with factory
	expect(decorated).toHaveBeenCalledTimes(2);
	expect(factory).toHaveBeenCalledTimes(1);
});

it("inject should call factory only once during resolve if resolved multiple times", async () => {
	type ServiceProvider = {
		fork: string;
	};

	const factory = vi.fn<InjectableFactory<never, string>>();
	factory.mockResolvedValue("42");

	const cut = inject<ServiceProvider>({
		fork: ({ decorator }) => {
			return decorator.invoke(factory);
		},
	});

	const r1 = await cut.fork();
	const r2 = await cut.fork();

	// Should not change value during invocation (i.e. we do not really care here what value this is).
	expect(r1).to.eq(r2);
	// While the decorated function is called twice, the resolving process should only be done once.
	expect(factory).toHaveBeenCalledOnce();
});

it("inject should not pass context to unrelated functions when resolved through container", async () => {
	type ServiceProvider = {
		message: string;
		log: (scope: string) => Promise<string>;
	};

	const message = vi.fn<InjectableFactory<never, string>>();
	message.mockResolvedValue("42");

	const log = vi.fn<InjectableFactory<[string], string>>();

	const cut = inject<ServiceProvider>({
		message: ({ decorator }) => {
			return decorator.invoke(message);
		},

		log: ({ decorator, container: { message } }) => {
			log.mockImplementation((scope) => {
				return `[${scope}]: ${message}`;
			});
			return decorator.invoke(log);
		},
	});

	const result = await cut.log("scope");

	expect(result).to.eq("[scope]: 42");
	// Resolving through scope should always pass the respective context.
	expect(log).toHaveBeenCalledWith("scope");
	// Resolving through container should never pass any context.
	expect(message).toHaveBeenCalledWith();
});

it("inject should proxy all context to the factory", async () => {
	type ServiceProvider = {
		log: (scope: string, message: string) => string;
	};

	const message = vi.fn<InjectableFactory<[string, string], string>>((scope, message) => {
		return `[${scope}] ${message}`;
	});

	const cut = inject<ServiceProvider>({
		log: ({ decorator }) => {
			return decorator.invoke(message);
		},
	});

	const result = await cut.log("scope", "message");

	expect(message).toHaveBeenCalledWith("scope", "message");
	expect(result).to.eq("[scope] message");
});

it("inject should resolve nested object from injectable", async () => {
	type ServiceProvider = {
		config: {
			database: {
				host: string;
			};
		};

		user: string;
	};

	const cut = inject<ServiceProvider>({
		config: ({ decorator }) => {
			return decorator.invoke(() => {
				return {
					database: {
						host: "redis",
					},
				};
			});
		},

		user: ({
			decorator,
			container: {
				config: { database },
			},
		}) => {
			return decorator.invoke(() => {
				return `Database '${database.host}' connected.`;
			});
		},
	});

	const result = await cut.user();

	expect(result).to.eq("Database 'redis' connected.");
});

it("inject should resolve promise from scope with the correct value", async () => {
	type ServiceProvider = {
		message: string;
	};

	// eslint-disable-next-line @typescript-eslint/await-thenable
	const cut = await inject<ServiceProvider>({
		message: ({ decorator }) => {
			return decorator.invoke(() => {
				return "42";
			});
		},
	});

	const result = await cut.message();

	expect(result).to.eq("42");
});
