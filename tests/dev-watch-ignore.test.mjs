import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
	devWatchIgnoredDirs,
	resolveDevWatchIgnoredPatterns,
} from "../src/utils/site-source/dev-watch-ignore.mjs";

test("dev watch ignores non-runtime project directories", () => {
	assert.deepEqual(devWatchIgnoredDirs, [
		".astro",
		".backup",
		".frontmatter",
		".github",
		".playwright-mcp",
		".serena",
		".temp",
		".vscode",
		".wrangler",
		"dist",
		"docs",
		"node_modules",
		"playwright-report",
		"public",
		"scripts",
		"test-results",
		"tests",
	]);
});

test("resolveDevWatchIgnoredPatterns returns root-scoped glob patterns", () => {
	const rootDir = path.resolve("fixtures", "fangyuan-root");
	const patterns = resolveDevWatchIgnoredPatterns(rootDir);

	assert.equal(
		patterns.includes(`${rootDir.replace(/\\/g, "/")}/docs/**`),
		true,
	);
	assert.equal(
		patterns.includes(`${rootDir.replace(/\\/g, "/")}/tests/**`),
		true,
	);
	assert.equal(
		patterns.includes(`${rootDir.replace(/\\/g, "/")}/src/**`),
		false,
	);
});
