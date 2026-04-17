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

test("FangYuan should switch runtime discussion data from provider objects to QingYan bootstrap access", async () => {
	const [
		postPageSource,
		qingyanClientSource,
		typeConfigSource,
		runtimeConfigSource,
		siteConfigSource,
	] = await Promise.all([
		readRepoFile("src", "pages", "posts", "[...slug].astro"),
		readRepoFile("src", "utils", "qingyan", "client.ts"),
		readRepoFile("src", "types", "config.ts"),
		readRepoFile("src", "config.ts"),
		readRepoFile("site", "config.ts"),
	]);

	assert.match(postPageSource, /pageMetricsConfig\.enable && pageMetricsConfig\.qingyan/);
	assert.match(postPageSource, /pageFeedbackConfig\.enable && pageFeedbackConfig\.qingyan/);
	assert.match(postPageSource, /commentConfig\.enable && commentConfig\.qingyan/);
	assert.match(qingyanClientSource, /fetchPostEngagementBootstrap/);
	assert.match(qingyanClientSource, /\/comments\/bootstrap/);
	assert.match(qingyanClientSource, /commentForm/);
	assert.match(qingyanClientSource, /getQingYanClient/);
	assert.match(typeConfigSource, /export type QingYanClientConfig = \{/);
	assert.match(typeConfigSource, /qingyan\?: QingYanClientConfig \| null;/);
	assert.match(runtimeConfigSource, /qingyan: override\.qingyan \?\? defaultConfig\.qingyan/);
	assert.match(siteConfigSource, /export const qingyanDevProxyTarget = /);
	assert.doesNotMatch(siteConfigSource, /commentProvider|pageMetricsProvider|pageFeedbackProvider/);
	assert.doesNotMatch(siteConfigSource, /legacy|provider/i);
});
