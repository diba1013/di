import { container } from "@/container.proxy";
import { Services } from "@/global.types";
import { describe, expect, it, vi } from "vitest";

describe("container", () => {
	it("should only call factory once", () => {
		const factory = vi.fn();
		factory.mockResolvedValue({});

		const cut = container({
			factory,
		});

		cut.factory;
		cut.factory;

		expect(factory).toHaveBeenCalledOnce();
	});

	it("should throw if key is not present", () => {
		const cut = container<Services>({});

		expect(() => cut.nonExistent).to.throw();
	});
});
