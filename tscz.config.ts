import { name, version } from "./package.json";
import { defineConfig } from "@diba1013/tscz";

const SOURCE = "lib";

function input(name: string): string {
	return `${SOURCE}/${name}`;
}

export default defineConfig({
	name,
	entries: [
		{
			name: "index",
			input: input("main.ts"),
			output: ["cjs", "esm", "dts"],
		},
	],
	env: {
		__NAME__: name,
		__VERSION__: version,
	},
});
