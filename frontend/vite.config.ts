import react from "@vitejs/plugin-react";
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tsConfigPaths()],
	define: {
		__APP_ID__: JSON.stringify("smart-receipts"),
		__API_PATH__: JSON.stringify("/routes"),
		__API_URL__: JSON.stringify(process.env.VITE_API_URL || "http://localhost:8000"),
		__API_HOST__: JSON.stringify(process.env.VITE_API_URL || "http://localhost:8000"),
		__API_PREFIX_PATH__: JSON.stringify("/routes"),
		__WS_API_URL__: JSON.stringify(""),
		__APP_BASE_PATH__: JSON.stringify("/"),
		__APP_TITLE__: JSON.stringify("Smart Receipts"),
		__APP_FAVICON_LIGHT__: JSON.stringify("/favicon.ico"),
		__APP_FAVICON_DARK__: JSON.stringify("/favicon.ico"),
		__APP_DEPLOY_USERNAME__: JSON.stringify(""),
		__APP_DEPLOY_APPNAME__: JSON.stringify("smart-receipts"),
		__APP_DEPLOY_CUSTOM_DOMAIN__: JSON.stringify(""),
	},
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
			{ find: /^@\/components\/ui\/(.*)$/, replacement: path.resolve(__dirname, "./src/extensions/shadcn/components/$1.tsx") },
			{ find: /^@\/components\/hooks\/(.*)$/, replacement: path.resolve(__dirname, "./src/extensions/shadcn/hooks/$1.ts") },
			{ find: /^@\/hooks\/(.*)$/, replacement: path.resolve(__dirname, "./src/extensions/shadcn/hooks/$1.ts") },
			{ find: "@/lib/utils", replacement: path.resolve(__dirname, "./src/lib/utils.ts") },
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
