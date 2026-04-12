import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.join(
	currentDir,
	"..",
	"src",
	"components",
	"widget",
	"NavMenuPanel.astro",
);

test("NavMenuPanel should use semantic text utilities instead of raw light/dark pairs", async () => {
	const source = await readFile(componentPath, "utf8");

	assert.match(
		source,
		/text-75/,
		"NavMenuPanel should use the shared text-75 utility for link labels",
	);
	assert.match(
		source,
		/text-25/,
		"NavMenuPanel should use the shared text-25 utility for external-link affordances",
	);

	const bannedPatterns = [
		/text-black\/75 dark:text-white\/75/,
		/text-black\/25 dark:text-white\/25/,
		/text-\[1\.25rem\]/,
		/text-\[0\.75rem\]/,
	];

	for (const pattern of bannedPatterns) {
		assert.doesNotMatch(
			source,
			pattern,
			`NavMenuPanel should not regress to ${pattern}`,
		);
	}
});
