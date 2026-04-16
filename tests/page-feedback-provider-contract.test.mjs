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

test("Artalk page feedback should reuse comment page snapshots and avoid private page fetch endpoints", async () => {
	const [providerSource, pagesSource, commentsSource, snapshotSource] =
		await Promise.all([
			readRepoFile("src", "utils", "page-feedback", "artalk-provider.ts"),
			readRepoFile("src", "utils", "artalk", "pages.ts"),
			readRepoFile("src", "utils", "artalk", "comments.ts"),
			readRepoFile("src", "utils", "artalk", "page-snapshot.ts"),
		]);

	assert.match(snapshotSource, /export type ArtalkPageSnapshot = \{/);
	assert.match(snapshotSource, /export function getArtalkPageSnapshot\(/);
	assert.match(snapshotSource, /export function setArtalkPageSnapshotLoad\(/);
	assert.match(snapshotSource, /export function getArtalkPageSnapshotLoad\(/);
	assert.match(snapshotSource, /export function waitForArtalkPageSnapshot\(/);
	assert.match(snapshotSource, /export function patchArtalkPageSnapshot\(/);

	assert.match(
		commentsSource,
		/import \{[\s\S]*setArtalkPageSnapshotLoad[\s\S]*\} from "\.\/page-snapshot";/,
	);
	assert.match(commentsSource, /setArtalkPageSnapshotLoad\(input\.postKey,/);
	assert.match(
		commentsSource,
		/response\.page \? setArtalkPageSnapshot\(input\.postKey, mapArtalkPageSnapshot\(response\.page\)\) : null/,
	);

	assert.match(pagesSource, /export function createArtalkPageFeedbackService\(/);
	assert.match(pagesSource, /createArtalkCommentsApi\(normalizedConfig\)/);
	assert.match(pagesSource, /getArtalkPageSnapshot\(postKey\)/);
	assert.match(pagesSource, /getArtalkPageSnapshotLoad\(postKey\)/);
	assert.match(pagesSource, /waitForArtalkPageSnapshot\(postKey,\s*600\)/);
	assert.match(pagesSource, /\/api\/v2\/votes\/page\/\$\{targetId\}\//);
	assert.match(pagesSource, /\/api\/v2\/votes\/page\/\$\{targetId\}\/up\//);
	assert.doesNotMatch(
		pagesSource,
		/\/pages\/\{id\}\/fetch|\/api\/v2\/pages\/\$\{.*\}\/fetch/,
		"page feedback should not rely on the private page fetch endpoints for public runtime data",
	);

	assert.match(
		providerSource,
		/export class ArtalkPageFeedbackProvider extends PageFeedbackProvider \{/,
	);
	assert.match(providerSource, /createArtalkPageFeedbackService\(/);
	assert.match(
		providerSource,
		/return this\.artalkPageFeedbackService\.getState\(input\)/,
	);
	assert.match(
		providerSource,
		/return this\.artalkPageFeedbackService\.likePage\(input\)/,
	);
});
