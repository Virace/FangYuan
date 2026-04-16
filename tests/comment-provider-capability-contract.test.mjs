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

test("comment providers should declare persistence and capability semantics explicitly", async () => {
	const [mockSource, wpSource, artalkCommentsSource] = await Promise.all([
		readRepoFile("src", "utils", "comments", "mock-provider.ts"),
		readRepoFile("src", "utils", "comments", "wp-provider.ts"),
		readRepoFile("src", "utils", "artalk", "comments.ts"),
	]);

	assert.match(mockSource, /supportsVote:\s*false/);
	assert.match(mockSource, /supportsCaptcha:\s*false/);
	assert.match(mockSource, /persistenceMode:\s*"preview_only"/);
	assert.match(mockSource, /identityModel:\s*"preview"/);

	assert.match(wpSource, /supportsVote:\s*false/);
	assert.match(wpSource, /supportsCaptcha:\s*false/);
	assert.match(wpSource, /persistenceMode:\s*"persistent"/);
	assert.match(wpSource, /identityModel:\s*"mirrored_post"/);

	assert.match(artalkCommentsSource, /supportsVote:\s*true/);
	assert.match(artalkCommentsSource, /supportsCaptcha:\s*true/);
	assert.match(artalkCommentsSource, /identityModel:\s*"page_key"/);
});
