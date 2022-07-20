import { container } from "@/container.proxy";
import { Container, ContainerFactory, Services } from "@/global.types";

export * from "@/global.types";

export const DI = {
	create<T extends Services>(crate: ContainerFactory<T>): Container<T> {
		return container(crate);
	},
};
