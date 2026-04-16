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

test("post pages should mount page feedback between Markdown and License", async () => {
	const postPageSource = await readRepoFile(
		"src",
		"pages",
		"posts",
		"[...slug].astro",
	);

	assert.match(
		postPageSource,
		/import PostFeedback from "@components\/page-feedback\/PostFeedback\.svelte";/,
	);
	assert.match(postPageSource, /pageFeedbackConfig/);
	assert.match(
		postPageSource,
		/<Markdown[\s\S]*<\/Markdown>[\s\S]*PostFeedback[\s\S]*License/s,
	);
	assert.match(
		postPageSource,
		/rewardOptions=\{pageFeedbackConfig\.rewardOptions \?\? \[\]\}/,
	);
});
