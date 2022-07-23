import { describe, expect, it, vi } from "vitest";
import { method } from "@/method.proxy";

describe("method", () => {
	it("should call method with params", async () => {
		const call = vi.fn();
		const instance = {
			call,
		};

		const factory = vi.fn();
		factory.mockResolvedValue({
			name: "call",
			method: call,
			instance,
		});

		const cut = method(factory);

		await cut();

		expect(factory).toHaveBeenCalledOnce();
	});

	it("should throw if method is not present", async () => {
		const factory = vi.fn();
		factory.mockResolvedValue({});

		const cut = method(factory);

		await expect(cut()).rejects.toThrow();
	});
});
