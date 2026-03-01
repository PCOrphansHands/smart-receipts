import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
	},
	resolve: {
		alias: [
			{ find: "utils", replacement: path.resolve(__dirname, "./src/utils") },
		],
	},
});
