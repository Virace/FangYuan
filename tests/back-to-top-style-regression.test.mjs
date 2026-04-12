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
	"control",
	"BackToTop.astro",
);

const extractSection = (source, startPattern, endPattern) => {
	const startIndex = source.indexOf(startPattern);
	assert.notEqual(startIndex, -1, `Missing section start: ${startPattern}`);

	const endIndex = endPattern
		? source.indexOf(endPattern, startIndex)
		: source.length;
	assert.notEqual(endIndex, -1, `Missing section end: ${endPattern}`);

	return source.slice(startIndex, endIndex);
};

test("back-to-top keeps the original desktop offset semantics", async () => {
	const source = await readFile(componentPath, "utf8");

	const baseSection = extractSection(
		source,
		".back-to-top-btn",
		"\n    &.hide",
	);
	const hideSection = extractSection(source, "&.hide", "\n    &:active");
	const activeSection = extractSection(source, "&:active", "\n\n</style>");

	assert.match(
		baseSection,
		/transform: translateX\(5rem\)/,
		"Visible BackToTop state should keep the original 5rem horizontal offset",
	);
	assert.doesNotMatch(
		baseSection,
		/right: 0/,
		"BackToTop should not be hard-pinned to the viewport right edge",
	);
	assert.match(
		hideSection,
		/transform: translateX\(5rem\) scale\(0\.9\)/,
		"Hidden BackToTop state should preserve the original offset and scale animation",
	);
	assert.match(
		activeSection,
		/transform: translateX\(5rem\) scale\(0\.9\)/,
		"Active BackToTop state should keep the same horizontal offset as the original implementation",
	);
});
