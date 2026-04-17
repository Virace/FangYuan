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

test("page feedback UI should render a one-time like button and a dialog-based reward modal", async () => {
	const [postFeedbackSource, rewardModalSource, mainCssSource, qingyanClientSource] = await Promise.all([
		readRepoFile("src", "components", "page-feedback", "PostFeedback.svelte"),
		readRepoFile("src", "components", "page-feedback", "RewardModal.svelte"),
		readRepoFile("src", "styles", "main.css"),
		readRepoFile("src", "utils", "qingyan", "client.ts"),
	]);

	assert.match(postFeedbackSource, /getQingYanClient\(\)/);
	assert.match(postFeedbackSource, /fetchPostEngagementBootstrap\(/);
	assert.match(postFeedbackSource, /likePage\(/);
	assert.match(postFeedbackSource, /RewardModal/);
	assert.match(postFeedbackSource, /rewardOptions/);
	assert.match(postFeedbackSource, /pageFeedbackLike|pageFeedbackLiked/);
	assert.match(postFeedbackSource, /pageFeedbackReward/);
	assert.match(postFeedbackSource, /liked = false/);
	assert.match(postFeedbackSource, /supportsLike/);
	assert.match(postFeedbackSource, /showReward = rewardOptions.length > 0/);
	assert.match(postFeedbackSource, /showLike = capability\?\.supportsLike \?\? false/);
	assert.match(qingyanClientSource, /fetchPostEngagementBootstrap/);
	assert.match(qingyanClientSource, /likePage/);

	assert.match(rewardModalSource, /<dialog/);
	assert.match(rewardModalSource, /showModal\(\)/);
	assert.match(rewardModalSource, /pageFeedbackRewardTitle/);
	assert.match(rewardModalSource, /pageFeedbackRewardDescription/);
	assert.match(rewardModalSource, /options\.length > 0/);
	assert.match(rewardModalSource, /on:click=\{handleBackdropClick\}/);
	assert.doesNotMatch(rewardModalSource, /<style>/);
	assert.match(mainCssSource, /\.feedback-dialog\s*\{/);
	assert.match(mainCssSource, /\.feedback-dialog\[open\]/);
	assert.match(mainCssSource, /\.feedback-dialog::backdrop/);
	assert.match(mainCssSource, /\.feedback-dialog-panel-open/);
});

test("page feedback UI should expose translation keys across all language packs", async () => {
	const [i18nKeySource, ...languageSources] = await Promise.all([
		readRepoFile("src", "i18n", "i18nKey.ts"),
		readRepoFile("src", "i18n", "languages", "en.ts"),
		readRepoFile("src", "i18n", "languages", "es.ts"),
		readRepoFile("src", "i18n", "languages", "id.ts"),
		readRepoFile("src", "i18n", "languages", "ja.ts"),
		readRepoFile("src", "i18n", "languages", "ko.ts"),
		readRepoFile("src", "i18n", "languages", "th.ts"),
		readRepoFile("src", "i18n", "languages", "tr.ts"),
		readRepoFile("src", "i18n", "languages", "vi.ts"),
		readRepoFile("src", "i18n", "languages", "zh_CN.ts"),
		readRepoFile("src", "i18n", "languages", "zh_TW.ts"),
	]);

	for (const key of [
		"pageFeedbackLike",
		"pageFeedbackLiked",
		"pageFeedbackLikeFailed",
		"pageFeedbackReward",
		"pageFeedbackRewardTitle",
		"pageFeedbackRewardDescription",
		"pageFeedbackClose",
	]) {
		assert.match(i18nKeySource, new RegExp(`${key}\\s*=`));
		for (const source of languageSources) {
			assert.match(source, new RegExp(`\\[Key\\.${key}\\]`));
		}
	}
});
