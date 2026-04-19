import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const fuwariRoot = process.env.FUWARI_REPO_PATH
	? path.resolve(process.env.FUWARI_REPO_PATH)
	: path.resolve(configDir, "..", "fuwari");

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "radius-baseline.capture.spec.ts",
	timeout: 60_000,
	expect: {
		timeout: 5_000,
	},
	fullyParallel: false,
	retries: 0,
	reporter: [["list"]],
	use: {
		baseURL: "http://127.0.0.1:9901",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		...devices["Desktop Chrome"],
	},
	projects: [
		{
			name: "chromium",
			use: {
				browserName: "chromium",
			},
		},
	],
	webServer: {
		command: "pnpm astro dev --host 127.0.0.1 --port 9901",
		url: "http://127.0.0.1:9901",
		cwd: fuwariRoot,
		reuseExistingServer: true,
		timeout: 180_000,
	},
});
