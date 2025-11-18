import type { Crate } from "~/main";
import { create, inject } from "~/main";
import { beforeEach, describe, expect, it } from "vitest";

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

describe("library", () => {
	let cut: Crate<DynamicApplicationServiceProvider>;

	beforeEach(() => {
		cut = {
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
		};
	});

	it("inject should resolve all services correctly", async () => {
		const dynamic = inject(cut);

		const du = await dynamic.api("user");
		const dr = await dynamic.api("repository");

		expect(du.fetch()).to.eq("[redis] user");
		expect(dr.fetch()).to.eq("[redis] repository");
	});

	it("create should allow to resolve arbitrary functions with scope context", async () => {
		const dynamic = create(cut);

		const result = await dynamic.resolve(({ decorator, scope: { api } }) => {
			return decorator.invoke(async () => {
				const du = await api("user");
				return du.fetch();
			});
		});

		expect(result).to.eql("[redis] user");
	});
});
