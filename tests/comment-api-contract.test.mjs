import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

async function readRepoFile(...segments) {
	return readFile(path.join(repoRoot, ...segments), "utf8");
}

async function listDirectory(relativePath) {
	const entries = await readdir(path.join(repoRoot, relativePath));
	return entries.sort((left, right) => left.localeCompare(right));
}

test("comment runtime should use a thin QingYan browser client instead of provider classes", async () => {
	const [
		commentsProviderSource,
		qingyanClientSource,
		qingyanContractsSource,
		configTypeSource,
		defaultConfigSource,
	] = await Promise.all([
		readRepoFile("src", "utils", "comments", "provider.ts"),
		readRepoFile("src", "utils", "qingyan", "client.ts"),
		readRepoFile("src", "utils", "qingyan", "contracts.ts"),
		readRepoFile("src", "types", "config.ts"),
		readRepoFile("src", "default-config.ts"),
	]);

	assert.doesNotMatch(commentsProviderSource, /export abstract class CommentProvider \{/);
	assert.doesNotMatch(commentsProviderSource, /getCommentProvider\(/);
	assert.match(commentsProviderSource, /export type CommentForm = \{/);
	assert.match(commentsProviderSource, /allow:\s*CommentAuthorField\[\];/);
	assert.match(commentsProviderSource, /require:\s*CommentAuthorField\[\];/);
	assert.match(commentsProviderSource, /export type CommentCapability = \{/);
	assert.doesNotMatch(commentsProviderSource, /requiredAuthorFields:\s*CommentAuthorField\[\];/);
	assert.doesNotMatch(commentsProviderSource, /optionalAuthorFields:\s*CommentAuthorField\[\];/);
	assert.match(commentsProviderSource, /export class CommentCaptchaRequiredError extends Error \{/);
	assert.match(commentsProviderSource, /export type CreateCommentInput = \{/);
	assert.match(commentsProviderSource, /export type VoteCommentInput = \{/);

	assert.match(qingyanContractsSource, /export type QingYanClientConfig = \{/);
	assert.match(qingyanContractsSource, /export type QingYanBootstrapPayload =/);
	assert.match(qingyanContractsSource, /commentForm:\s*CommentForm;/);
	assert.match(qingyanClientSource, /export function createQingYanClient/);
	assert.match(qingyanClientSource, /export function getQingYanClient/);
	assert.match(qingyanClientSource, /fetchPostEngagementBootstrap/);
	assert.match(qingyanClientSource, /fetchCommentThread/);
	assert.match(qingyanClientSource, /createComment/);
	assert.match(qingyanClientSource, /voteComment/);
	assert.match(qingyanClientSource, /likePage/);
	assert.match(qingyanClientSource, /\/comments\/bootstrap/);
	assert.match(qingyanClientSource, /\/page-feedback\/like/);
	assert.match(qingyanClientSource, /type RawQingYanCommentForm = \{/);
	assert.match(qingyanClientSource, /commentForm:\s*RawQingYanCommentForm;/);
	assert.match(qingyanClientSource, /function normalizeCommentForm\(/);
	assert.match(qingyanClientSource, /commentForm:\s*normalizeCommentForm\(response\.commentForm\)/);
	assert.doesNotMatch(qingyanClientSource, /require:\s*capability\.require/);

	assert.match(configTypeSource, /qingyan\?: QingYanClientConfig \| null;/);
	assert.doesNotMatch(configTypeSource, /provider\?: CommentProvider \| null;/);
	assert.doesNotMatch(configTypeSource, /provider\?: PageMetricsProvider \| null;/);
	assert.doesNotMatch(configTypeSource, /provider\?: PageFeedbackProvider \| null;/);

	assert.match(defaultConfigSource, /qingyan: null,/);
	assert.doesNotMatch(defaultConfigSource, /mockCommentProvider/);
});

test("FangYuan should keep a minimal QingYan-focused browser utility layout", async () => {
	const [utilsDirectories, commentUtilityFiles, pageFeedbackFiles, pageMetricsFiles, qingyanFiles] =
		await Promise.all([
			listDirectory(path.join("src", "utils")).then((entries) =>
				entries.filter((entry) => !entry.includes(".")),
			),
			listDirectory(path.join("src", "utils", "comments")),
			listDirectory(path.join("src", "utils", "page-feedback")),
			listDirectory(path.join("src", "utils", "page-metrics")),
			listDirectory(path.join("src", "utils", "qingyan")),
		]);

	assert.deepEqual(utilsDirectories, ["comments", "page-feedback", "page-metrics", "qingyan"]);
	assert.deepEqual(commentUtilityFiles, [
		"options.ts",
		"post-key.ts",
		"provider.ts",
		"tree.ts",
		"validation.ts",
		"vote-state.ts",
	]);
	assert.deepEqual(pageFeedbackFiles, ["provider.ts"]);
	assert.deepEqual(pageMetricsFiles, ["provider.ts"]);
	assert.deepEqual(qingyanFiles, ["client.ts", "contracts.ts", "dev-proxy.mjs"]);
});
