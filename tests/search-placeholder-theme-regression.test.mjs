import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.join(currentDir, "..", "src", "components", "Search.svelte");

test("Search should explicitly style placeholder colors for light and dark themes", async () => {
	const source = await readFile(componentPath, "utf8");

	assert.match(
		source,
		/placeholder:text-black\/25/,
		"Search should explicitly set the light-theme placeholder color after the Tailwind v4 placeholder default change",
	);
	assert.match(
		source,
		/dark:placeholder:text-white\/25/,
		"Search should explicitly set the dark-theme placeholder color after the Tailwind v4 placeholder default change",
	);

	const legacyImplicitPattern =
		/text-black\/50 dark:text-white\/50(?!"?(?:\s|[^\n"])*placeholder:)/;

	assert.doesNotMatch(
		source,
		legacyImplicitPattern,
		"Search should not rely on the implicit v4 placeholder currentColor behavior for the search inputs",
	);
});
