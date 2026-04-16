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

test("page feedback config should expose reward options and provider contracts", async () => {
	const [
		configTypeSource,
		defaultConfigSource,
		appConfigSource,
		providerSource,
		clientSource,
	] = await Promise.all([
		readRepoFile("src", "types", "config.ts"),
		readRepoFile("src", "default-config.ts"),
		readRepoFile("src", "config.ts"),
		readRepoFile("src", "utils", "page-feedback", "provider.ts"),
		readRepoFile("src", "utils", "page-feedback", "client.ts"),
	]);

	assert.match(
		configTypeSource,
		/import type \{[\s\S]*PageFeedbackProvider,[\s\S]*RewardOption,[\s\S]*\} from "@utils\/page-feedback\/provider";/,
	);
	assert.match(configTypeSource, /export type PageFeedbackConfig = \{/);
	assert.match(configTypeSource, /rewardOptions\?: RewardOption\[];/);

	assert.match(providerSource, /export type RewardOption = \{/);
	assert.match(providerSource, /image:\s*string;/);
	assert.match(providerSource, /export type PageFeedbackCapability = \{/);
	assert.match(providerSource, /export type PageFeedbackState = \{/);
	assert.match(providerSource, /likeCount:\s*number;/);
	assert.match(providerSource, /liked:\s*boolean;/);
	assert.match(
		providerSource,
		/abstract getCapability\(input: GetPageFeedbackInput\): Promise<PageFeedbackCapability>;/,
	);
	assert.match(
		providerSource,
		/abstract getState\(input: GetPageFeedbackInput\): Promise<PageFeedbackState>;/,
	);
	assert.match(
		providerSource,
		/abstract likePage\(input: LikePageInput\): Promise<PageFeedbackState>;/,
	);

	assert.match(clientSource, /export function getPageFeedbackClient\(\)/);
	assert.match(clientSource, /const provider = pageFeedbackConfig\.enable/);
	assert.match(clientSource, /async getState\(input: GetPageFeedbackInput\)/);
	assert.match(clientSource, /async likePage\(input: LikePageInput\)/);

	assert.match(
		defaultConfigSource,
		/export const defaultPageFeedbackConfig: PageFeedbackConfig = \{/,
	);
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
