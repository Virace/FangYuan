import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [["html"], ["github"]] : [["list"], ["html"]],
	use: {
		baseURL: "http://127.0.0.1:4331",
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
		command: "pnpm preview --host 127.0.0.1 --port 4331",
		url: "http://127.0.0.1:4331",
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
