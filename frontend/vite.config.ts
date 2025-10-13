import react from "@vitejs/plugin-react";
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tsConfigPaths()],
	server: {
		proxy: {
			"/routes": {
				target: "http://127.0.0.1:8000",
				changeOrigin: true,
			},
		},
	},
	resolve: {
		alias: [
			// More specific paths must come first
			{ find: /^@\/components\/ui\/(.*)$/, replacement: path.resolve(__dirname, "./src/extensions/shadcn/components/$1") },
			{ find: /^@\/components\/hooks\/(.*)$/, replacement: path.resolve(__dirname, "./src/extensions/shadcn/hooks/$1") },
			{ find: /^@\/hooks\/(.*)$/, replacement: path.resolve(__dirname, "./src/extensions/shadcn/hooks/$1") },
			{ find: /^@\/lib\/(.*)$/, replacement: path.resolve(__dirname, "./src/lib/$1") },
			{ find: "app/auth", replacement: path.resolve(__dirname, "./src/app/auth") },
			{ find: "brain", replacement: path.resolve(__dirname, "./src/brain") },
			{ find: "types", replacement: path.resolve(__dirname, "./src/brain/data-contracts.ts") },
			{ find: "components", replacement: path.resolve(__dirname, "./src/components") },
			{ find: "pages", replacement: path.resolve(__dirname, "./src/pages") },
			{ find: "app", replacement: path.resolve(__dirname, "./src/app") },
			{ find: "utils", replacement: path.resolve(__dirname, "./src/utils") },
			// General @ alias comes last
			{ find: "@", replacement: path.resolve(__dirname, "./src") },
		],
	},
});
