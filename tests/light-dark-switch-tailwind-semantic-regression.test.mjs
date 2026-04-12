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
	"LightDarkSwitch.svelte",
);

test("LightDarkSwitch should use semantic icon sizing utilities", async () => {
	const source = await readFile(componentPath, "utf8");

	assert.match(
		source,
		/text-xl/,
		"LightDarkSwitch should use the shared text-xl utility for mode icons",
	);
	assert.doesNotMatch(
		source,
		/text-\[1\.25rem\]/,
		"LightDarkSwitch should not regress to arbitrary 1.25rem icon sizing",
	);
});
