import { container } from "@/container.proxy";
import { Container, Crate, Services } from "@/global.types";

export * from "@/global.types";
export * from "@/util.types";

export const DI = {
	create<T extends Services>(crate: Crate<T>): Container<T> {
		return container(crate);
	},
};
