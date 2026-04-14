import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

function readRepoFile(...segments) {
	return readFile(path.join(repoRoot, ...segments), "utf8");
}

test("cover image semantics should combine official relative paths with explicit alias prefixes", async () => {
	const [contentConfigSource, configSource, imageSource, imageWrapperSource] =
		await Promise.all([
			readRepoFile("src", "content.config.ts"),
			readRepoFile("src", "config.ts"),
			readRepoFile("src", "utils", "image-source.ts"),
			readRepoFile("src", "components", "misc", "ImageWrapper.astro"),
		]);

	assert.match(
		contentConfigSource,
		/schema:\s*\(\{\s*image\s*\}\)\s*=>\s*z\.object\(/,
		"posts collection should use a schema callback so Astro's image() helper can participate",
	);

	assert.match(
		contentConfigSource,
		/relativeCoverImageSchema\(image\)/,
		"relative cover image paths should flow through the dedicated relative-path branch",
	);

	assert.match(
		contentConfigSource,
		/publicAliasSchema|publicPathSchema/,
		"cover image schema should keep explicit public aliases and public URLs as separate branches",
	);

	assert.match(
		contentConfigSource,
		/localAliasImageSchema/,
		"cover image schema should keep a non-relative local alias branch for assets/... style inputs",
	);

	assert.match(
		configSource,
		/export const configImageBaseRoots = \{/,
		"runtime config should expose base-root provenance for config-driven local images",
	);

	assert.match(
		imageSource,
		/export async function resolveContentImage\(/,
		"shared image resolver should expose content-image resolution",
	);

	assert.match(
		imageSource,
		/export async function resolveConfigImage\(/,
		"shared image resolver should expose config-image resolution",
	);

	assert.match(
		imageSource,
		/if \(isRelativePath\(value\)\)/,
		"resolver should preserve true relative-path semantics for cover images",
	);

	assert.match(
		imageSource,
		/return resolveRootAlias\(value, inferEntryBaseRoot\(entryFilePath\)\);/,
		"non-relative local cover image aliases should resolve through the root-alias branch",
	);

	assert.doesNotMatch(
		imageWrapperSource,
		/hasExternalSiteContent|import\.meta\.glob|basePath\?: string|buildLookupCandidates|resolveExternalSiteAssetCandidate/,
		"ImageWrapper should stop guessing file paths and only render resolved inputs",
	);
});
