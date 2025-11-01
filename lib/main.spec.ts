import { inject } from "~/main";
import { expect, it } from "vitest";

type Database = {
	name: () => string;
};

type Endpoint = {
	fetch: () => string;
};

type DynamicApplicationServiceProvider = {
	config: {
		environment: string;
	};

	redis: Database;
	mysql: Database;
	storage: Database;

	api: (name: string) => Endpoint;
};

it("inject should resolve all services correctly", async () => {
	const dynamic = inject<DynamicApplicationServiceProvider>({
		config: ({ decorator }) => {
			return decorator.invoke(() => {
				return {
					environment: process.env.NODE_ENV ?? "development",
				};
			});
		},

		redis: ({ decorator }) => {
			return decorator.invoke(() => {
				return {
					name: () => "redis",
				};
			});
		},

		mysql: ({ decorator }) => {
			return decorator.invoke(() => {
				return {
					name: () => "mysql",
				};
			});
		},

		storage: ({ decorator, container: { config }, scope }) => {
			return decorator.invoke(() => {
				return config.environment === "production" ? scope.mysql() : scope.redis();
			});
		},

		api: ({ decorator, container: { storage } }) => {
			return decorator.invoke((key) => {
				return {
					fetch() {
						return `[${storage.name()}] ${key}`;
					},
				};
			});
		},
	});

	const du = await dynamic.api("user");
	const dr = await dynamic.api("repository");

	expect(du.fetch()).to.eq("[redis] user");
	expect(dr.fetch()).to.eq("[redis] repository");
});
