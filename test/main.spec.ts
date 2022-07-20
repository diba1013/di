import { describe, expect, it } from "vitest";
import { DI } from "@/main";

class Retriever {
	constructor(private readonly value: string) {}

	async get(): Promise<string> {
		return this.value;
	}
}

type JoinerServiceProvider = {
	retriever: Retriever;
};

class Joiner {
	private readonly $expression: Retriever;

	constructor({ retriever: expression }: JoinerServiceProvider) {
		this.$expression = expression;
	}

	async join(prefix: string): Promise<string> {
		return `${prefix} ${await this.$expression.get()}`;
	}
}

type ServiceProvider = {
	prefix: string;

	retriever: Retriever;
	joiner: Joiner;
};

type DynamicServiceProvider = {
	context: {
		prefix: string;
		retrievers: Record<string, Retriever>;
	};
	joiners: Record<string, Joiner>;
};

describe("DI", () => {
	it("with raw types should resolve properly", async () => {
		const { joiner: calculator } = DI.create<ServiceProvider>({
			prefix: () => {
				return "42";
			},

			joiner: ({ container }) => {
				return new Joiner(container);
			},

			retriever: ({ container: { prefix } }) => {
				return new Retriever(prefix);
			},
		});

		expect(await calculator.join("Hello")).is.equal("Hello 42");
		expect(await calculator.join("World")).is.equal("World 42");
	});

	it("with factories should resolve properly", async () => {
		const { joiner: calculator } = DI.create<ServiceProvider>({
			prefix: ({ decorator }) => {
				return decorator.constant(() => {
					return "42";
				});
			},

			joiner: ({ decorator }) => {
				return decorator.factory(async (container) => {
					return new Joiner(container);
				});
			},

			retriever: ({ decorator }) => {
				return decorator.factory(async ({ prefix }) => {
					return new Retriever(prefix);
				});
			},
		});

		expect(await calculator.join("Hello")).is.equal("Hello 42");
		expect(await calculator.join("World")).is.equal("World 42");
	});

	it("service factory should call constructor", async () => {
		const { joiner: calculator } = DI.create<ServiceProvider>({
			prefix: ({ decorator }) => {
				return decorator.raw(() => "42");
			},

			joiner: ({ decorator }) => {
				return decorator.service(Joiner);
			},

			retriever: ({ container: { prefix } }) => {
				return new Retriever(prefix);
			},
		});

		expect(await calculator.join("Hello")).is.equal("Hello 42");
		expect(await calculator.join("World")).is.equal("World 42");
	});

	it("nest", async () => {
		const {
			joiners: { "42": hello, "24": world },
		} = DI.create<DynamicServiceProvider>({
			context: ({ decorator }) => {
				return decorator.nest({
					prefix: () => {
						return "number";
					},

					retrievers: ({ decorator: child, container: { prefix } }) => {
						return child.nest(({ key }) => {
							return new Retriever(`${prefix} ${key}`);
						});
					},
				});
			},

			joiners: ({ decorator, container: { context } }) => {
				return decorator.nest(({ key }) => {
					return new Joiner({
						retriever: context.retrievers[key],
					});
				});
			},
		});

		expect(await hello.join("Hello")).is.equal("Hello number 42");
		expect(await world.join("World")).is.equal("World number 24");
	});
});
