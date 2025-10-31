import metadata from "./package.json" with { type: "json" };
import { defineConfig } from "tsdown";

const { name, version } = metadata;
export default defineConfig({
	shims: true,
	dts: true,
	platform: "neutral",
	entry: {
		index: "lib/main.ts",
	},
	format: ["cjs", "esm"],

	env: {
		__NAME__: name,
		__VERSION__: version,
	},
});
