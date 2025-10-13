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
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@/components/ui": path.resolve(__dirname, "./src/extensions/shadcn/components"),
			"@/hooks": path.resolve(__dirname, "./src/extensions/shadcn/hooks"),
			"@/components/hooks": path.resolve(__dirname, "./src/extensions/shadcn/hooks"),
			"brain": path.resolve(__dirname, "./src/brain"),
			"types": path.resolve(__dirname, "./src/brain/data-contracts.ts"),
			"components": path.resolve(__dirname, "./src/components"),
			"pages": path.resolve(__dirname, "./src/pages"),
			"app": path.resolve(__dirname, "./src/app"),
			"app/auth": path.resolve(__dirname, "./src/app/auth"),
			"utils": path.resolve(__dirname, "./src/utils"),
		},
	},
});
