import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");
const componentPath = path.join(repoRoot, "src", "components", "Search.svelte");
const themePath = path.join(repoRoot, "src", "styles", "tailwind-theme.css");

test("Search should use repo-local v4 semantic utilities for shell and token-backed text styling", async () => {
	const [componentSource, themeSource] = await Promise.all([
		readFile(componentPath, "utf8"),
		readFile(themePath, "utf8"),
	]);

	assert.match(
		themeSource,
		/@utility search-field-shell\b/,
		"tailwind-theme.css should define search-field-shell as the shared search field utility",
	);
	assert.match(
		themeSource,
		/@utility search-panel-shell\b/,
		"tailwind-theme.css should define search-panel-shell as the shared search panel utility",
	);

	const requiredPatterns = [
		/search-field-shell/,
		/search-panel-shell/,
		/text-30/,
		/text-50/,
		/text-xl/,
		/text-xs/,
		/placeholder:text-black\/25/,
		/dark:placeholder:text-white\/25/,
	];

	for (const pattern of requiredPatterns) {
		assert.match(
			componentSource,
			pattern,
			`Search.svelte should include ${pattern} after the v4 semantic sweep`,
		);
	}

	const bannedPatterns = [
		/bg-black\/4 hover:bg-black\/6 focus-within:bg-black\/6/,
		/dark:bg-white\/5 dark:hover:bg-white\/10 dark:focus-within:bg-white\/10/,
		/text-black\/30 dark:text-white\/30/,
		/text-black\/50 dark:text-white\/50(?![\s\S]*placeholder:)/,
		/text-\[1\.25rem\]/,
		/text-\[0\.75rem\]/,
		/\.search-panel\s*\{/,
	];

	for (const pattern of bannedPatterns) {
		assert.doesNotMatch(
			componentSource,
			pattern,
			`Search.svelte should not regress to ${pattern}`,
		);
	}
});
