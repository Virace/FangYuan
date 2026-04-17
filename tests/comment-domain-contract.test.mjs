import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

async function exists(relativePath) {
	try {
		await access(path.join(repoRoot, relativePath));
		return true;
	} catch {
		return false;
	}
}

test("comment runtime foundation should avoid removed Astro hybrid output mode", async () => {
	const astroConfig = await readFile(path.join(repoRoot, "astro.config.mjs"), "utf8");
	assert.doesNotMatch(
		astroConfig,
		/output:\s*"hybrid"/,
		'Astro v5+ merged hybrid into static and no longer accepts output: "hybrid"',
	);
});

test("comment domain should keep canonical UI types and QingYan-backed config shape", async () => {
	const [
		commentTypesSource,
		postKeySource,
		treeSource,
		envExists,
		appConfigSource,
		defaultConfigSource,
		typesConfigSource,
		optionsSource,
		commentsProviderSource,
		pageFeedbackProviderSource,
		pageMetricsProviderSource,
	] = await Promise.all([
		readFile(path.join(repoRoot, "src", "types", "comment.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "comments", "post-key.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "comments", "tree.ts"), "utf8"),
		exists(path.join("src", "env.d.ts")),
		readFile(path.join(repoRoot, "src", "config.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "default-config.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "types", "config.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "comments", "options.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "comments", "provider.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "page-feedback", "provider.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "page-metrics", "provider.ts"), "utf8"),
	]);

	assert.match(
		commentTypesSource,
		/export type CommentStatus =[\s\S]*"approved"[\s\S]*"pending_remote"[\s\S]*"local_pending"/,
	);
	assert.match(commentTypesSource, /export type CommentVoteChoice = "up" \| "down";/);
	assert.match(commentTypesSource, /export type CanonicalComment = \{/);
	assert.match(commentTypesSource, /children:\s*CanonicalComment\[\];/);
	assert.match(commentTypesSource, /export type PendingEditTokenPayload = \{/);

	assert.match(postKeySource, /export function getPostKeyFromEntry\(/);
	assert.match(treeSource, /export function buildCommentTree\(/);
	assert.match(treeSource, /export function countCommentsInTree\(/);
	assert.match(treeSource, /export function insertPendingComment\(/);
	assert.equal(envExists, false);

	assert.match(commentsProviderSource, /export type CommentPersistenceMode = "persistent" \| "preview_only";/);
	assert.match(commentsProviderSource, /export type CommentIdentityModel = "page_key" \| "mirrored_post" \| "preview";/);
	assert.match(
		commentsProviderSource,
		/export type CommentAuthorField = "nickname" \| "email" \| "website";/,
	);
	assert.match(commentsProviderSource, /export type CommentForm = \{/);
	assert.match(commentsProviderSource, /allow:\s*CommentAuthorField\[\];/);
	assert.match(commentsProviderSource, /require:\s*CommentAuthorField\[\];/);
	assert.match(commentsProviderSource, /export type CommentCapability = \{/);
	assert.match(commentsProviderSource, /supportsVote:\s*boolean;/);
	assert.match(commentsProviderSource, /supportsCaptcha:\s*boolean;/);
	assert.match(
		commentsProviderSource,
		/export type CommentCapability = \{[\s\S]*supportsCaptcha:\s*boolean;[\s\S]*message\?: string;[\s\S]*\};/,
	);
	assert.doesNotMatch(commentsProviderSource, /requiredAuthorFields:\s*CommentAuthorField\[\];/);
	assert.doesNotMatch(commentsProviderSource, /optionalAuthorFields:\s*CommentAuthorField\[\];/);
	assert.match(commentsProviderSource, /export type CommentCaptchaHostMode =[\s\S]*"inline_value"[\s\S]*"iframe_widget"[\s\S]*"token_widget"/);
	assert.match(commentsProviderSource, /export type CommentCaptchaVerificationModel =[\s\S]*"backend_session"[\s\S]*"request_token"/);
	assert.match(commentsProviderSource, /export type CommentCaptchaChallenge =/);
	assert.match(commentsProviderSource, /export type CommentCaptchaState = \{/);
	assert.match(commentsProviderSource, /export type VerifyCommentCaptchaInput = \{/);
	assert.doesNotMatch(commentsProviderSource, /export abstract class CommentProvider \{/);
	assert.doesNotMatch(commentsProviderSource, /getCommentProvider\(/);

	assert.match(pageFeedbackProviderSource, /export type RewardOption = \{/);
	assert.match(pageFeedbackProviderSource, /export type PageFeedbackCapability = \{/);
	assert.match(pageFeedbackProviderSource, /export type PageFeedbackState = \{/);
	assert.doesNotMatch(pageFeedbackProviderSource, /export abstract class PageFeedbackProvider \{/);

	assert.match(pageMetricsProviderSource, /export type PageMetrics = \{/);
	assert.doesNotMatch(pageMetricsProviderSource, /export abstract class PageMetricsProvider \{/);

	assert.match(typesConfigSource, /export type QingYanClientConfig = \{/);
	assert.match(typesConfigSource, /export type CommentConfig = \{/);
	assert.match(typesConfigSource, /qingyan\?: QingYanClientConfig \| null;/);
	assert.match(typesConfigSource, /rootLimit\?: number;/);
	assert.match(typesConfigSource, /maxDepth\?: number;/);
	assert.match(typesConfigSource, /export type PageMetricsConfig = \{/);
	assert.match(typesConfigSource, /export type PageFeedbackConfig = \{/);
	assert.doesNotMatch(typesConfigSource, /provider\?: CommentProvider \| null;/);
	assert.doesNotMatch(typesConfigSource, /provider\?: PageMetricsProvider \| null;/);
	assert.doesNotMatch(typesConfigSource, /provider\?: PageFeedbackProvider \| null;/);

	assert.match(defaultConfigSource, /export const defaultCommentConfig: CommentConfig = \{/);
	assert.match(defaultConfigSource, /enable: true/);
	assert.match(defaultConfigSource, /qingyan: null,/);
	assert.match(defaultConfigSource, /rootLimit: DEFAULT_COMMENT_ROOT_LIMIT/);
	assert.match(defaultConfigSource, /maxDepth: DEFAULT_COMMENT_MAX_DEPTH/);
	assert.match(defaultConfigSource, /export const defaultPageMetricsConfig: PageMetricsConfig = \{/);
	assert.match(defaultConfigSource, /export const defaultPageFeedbackConfig: PageFeedbackConfig = \{/);

	assert.match(appConfigSource, /type ExternalSiteConfigModule = \{[\s\S]*commentConfig\?: CommentConfig;/);
	assert.match(appConfigSource, /function mergeCommentConfig\(/);
	assert.match(appConfigSource, /function mergePageMetricsConfig\(/);
	assert.match(appConfigSource, /function mergePageFeedbackConfig\(/);
	assert.match(appConfigSource, /qingyan: override\.qingyan \?\? defaultConfig\.qingyan/);
	assert.match(appConfigSource, /export const commentConfig: CommentConfig =/);
	assert.match(appConfigSource, /export const pageMetricsConfig: PageMetricsConfig =/);
	assert.match(appConfigSource, /export const pageFeedbackConfig: PageFeedbackConfig =/);

	assert.match(optionsSource, /export const DEFAULT_COMMENT_ROOT_LIMIT = 5;/);
	assert.match(optionsSource, /export const DEFAULT_COMMENT_MAX_DEPTH = 3;/);
	assert.match(optionsSource, /export const MIN_COMMENT_ROOT_LIMIT = 1;/);
	assert.match(optionsSource, /export const MIN_COMMENT_MAX_DEPTH = 1;/);
	assert.match(optionsSource, /DEFAULT_COMMENT_SORT_BY = "date_desc"/);
});
