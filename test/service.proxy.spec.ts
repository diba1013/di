import { describe, expect, it, vi } from "vitest";
import { Services } from "@/global.types";
import { service } from "@/service.proxy";

type Service = {
	fetch(): Promise<string>;
};

describe("service", () => {
	it("should call factory once", async () => {
		const factory = vi.fn();
		factory.mockResolvedValue({
			fetch: vi.fn(),
		});

		const cut = service<Services, Service>({}, factory);

		await cut.fetch();
		await cut.fetch();

		expect(factory).toHaveBeenCalledOnce();
	});

	it("should throw if method is not present", async () => {
		const factory = vi.fn();
		factory.mockResolvedValue({});

		const cut = service<Services, Service>({}, factory);

		await expect(cut.fetch()).rejects.toThrow();
	});
});
