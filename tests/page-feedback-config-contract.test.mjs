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

test("page feedback config should expose reward options and QingYan-facing thin contracts", async () => {
	const [
		configTypeSource,
		defaultConfigSource,
		appConfigSource,
		providerSource,
	] = await Promise.all([
		readRepoFile("src", "types", "config.ts"),
		readRepoFile("src", "default-config.ts"),
		readRepoFile("src", "config.ts"),
		readRepoFile("src", "utils", "page-feedback", "provider.ts"),
	]);

	assert.match(
		configTypeSource,
		/import type \{ RewardOption \} from "@utils\/page-feedback\/provider";/,
	);
	assert.match(configTypeSource, /export type PageFeedbackConfig = \{/);
	assert.match(configTypeSource, /qingyan\?: QingYanClientConfig \| null;/);
	assert.match(configTypeSource, /rewardOptions\?: RewardOption\[];/);

	assert.match(providerSource, /export type RewardOption = \{/);
	assert.match(providerSource, /image:\s*string;/);
	assert.match(providerSource, /export type PageFeedbackCapability = \{/);
	assert.match(providerSource, /export type PageFeedbackState = \{/);
	assert.match(providerSource, /likeCount:\s*number;/);
	assert.match(providerSource, /liked:\s*boolean;/);
	assert.doesNotMatch(providerSource, /export abstract class PageFeedbackProvider \{/);

	assert.match(
		defaultConfigSource,
		/export const defaultPageFeedbackConfig: PageFeedbackConfig = \{/,
	);
	assert.match(defaultConfigSource, /qingyan: null,/);
	assert.match(defaultConfigSource, /rewardOptions:\s*\[\],/);
	assert.match(
		appConfigSource,
		/type ExternalSiteConfigModule = \{[\s\S]*pageFeedbackConfig\?: PageFeedbackConfig;/,
	);
	assert.match(appConfigSource, /function mergePageFeedbackConfig\(/);
	assert.match(
		appConfigSource,
		/export const pageFeedbackConfig: PageFeedbackConfig = mergePageFeedbackConfig\(/,
	);
});
