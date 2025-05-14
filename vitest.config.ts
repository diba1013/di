/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"~": "/lib",
		},
	},
	test: {
		environment: "node",
		restoreMocks: true,
		coverage: {
			enabled: true,
			provider: "v8",
			all: true,
			include: ["lib/**/*.ts"],
			exclude: ["lib/**/*.types.ts"],
			reporter: ["html", "text-summary", "lcovonly"],
		},
	},
});
