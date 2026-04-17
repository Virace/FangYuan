import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

test("post pages should mount the page view counter through the shared QingYan bootstrap client", async () => {
	const [postPageSource, counterSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "pages", "posts", "[...slug].astro"), "utf8"),
		readFile(
			path.join(repoRoot, "src", "components", "page-metrics", "PageViewCounter.svelte"),
			"utf8",
		),
	]);

	assert.match(postPageSource, /PageViewCounter/);
	assert.match(postPageSource, /pageMetricsConfig\.enable && pageMetricsConfig\.qingyan/);
	assert.match(counterSource, /getQingYanClient\(\)/);
	assert.match(counterSource, /fetchPostEngagementBootstrap\(/);
	assert.match(counterSource, /pageViewCount/);
});
