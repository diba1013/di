import type { Scope, ScopeProvider } from "~/global.types";
import { describe } from "node:test";
import { expectTypeOf, it } from "vitest";

type ServiceProvider = {
	config: string;
};

describe("ServiceProvider", () => {
	it("should inherit correct scope return type", () => {
		const scope: ScopeProvider<ServiceProvider> = {} as unknown as ScopeProvider<ServiceProvider>;

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expectTypeOf(scope.scope).returns.toEqualTypeOf<Scope<ServiceProvider>>();
	});
});
