import { defineConfig } from "@diba1013/tscz";
import { version } from "./package.json";

const NAME = "ts";
const SOURCE = "src";

function input(name: string): string {
	return `${SOURCE}/${name}`;
}

export default defineConfig({
	name: NAME,
	entries: [
		{
			name: "index",
			input: input("index.ts"),
			output: ["cjs", "esm", "dts"],
		},
	],
	define: {
		__NAME__: NAME,
		__VERSION__: version,
	},
});
