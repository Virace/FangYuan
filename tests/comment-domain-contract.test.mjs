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
		"Astro v5+ merged hybrid into static and no longer accepts output: \"hybrid\"",
	);
});

test("comment domain should declare canonical types and pending token payload", async () => {
	const source = await readFile(path.join(repoRoot, "src", "types", "comment.ts"), "utf8");
	assert.match(
		source,
		/export type CommentStatus =[\s\S]*"approved"[\s\S]*"pending_remote"[\s\S]*"local_pending"/,
	);
	assert.match(source, /export type CommentVoteChoice = "up" \| "down";/);
	assert.match(source, /export type CanonicalComment = \{/);
	assert.match(source, /voteUp:\s*number;/);
	assert.match(source, /voteDown:\s*number;/);
	assert.match(source, /viewerVote\?:\s*CommentVoteChoice \| null;/);
	assert.match(source, /children:\s*CanonicalComment\[\];/);
	assert.match(source, /export type PendingEditTokenPayload = \{/);
});

test("comment helpers should expose postKey, tree, and config-driven comment settings", async () => {
	const [
		postKeySource,
		treeSource,
		envExists,
		appConfigSource,
		defaultConfigSource,
		typesConfigSource,
		optionsSource,
		providerSource,
	] =
		await Promise.all([
			readFile(path.join(repoRoot, "src", "utils", "comments", "post-key.ts"), "utf8"),
			readFile(path.join(repoRoot, "src", "utils", "comments", "tree.ts"), "utf8"),
			exists(path.join("src", "env.d.ts")),
			readFile(path.join(repoRoot, "src", "config.ts"), "utf8"),
			readFile(path.join(repoRoot, "src", "default-config.ts"), "utf8"),
			readFile(path.join(repoRoot, "src", "types", "config.ts"), "utf8"),
			readFile(path.join(repoRoot, "src", "utils", "comments", "options.ts"), "utf8"),
			readFile(path.join(repoRoot, "src", "utils", "comments", "provider.ts"), "utf8"),
		]);

	assert.match(postKeySource, /export function getPostKeyFromEntry\(/);
	assert.match(treeSource, /export function buildCommentTree\(/);
	assert.match(treeSource, /export function countCommentsInTree\(/);
	assert.match(
		treeSource,
		/return items\.reduce\(\s*\(total,\s*comment\)\s*=>\s*total \+ 1 \+ countCommentsInTree\(comment\.children\),\s*0,\s*\)/,
	);
	assert.match(treeSource, /export function insertPendingComment\(/);
	assert.equal(envExists, false, "comment system should no longer depend on src/env.d.ts");
	assert.match(providerSource, /postTitle\?: string;/);
	assert.match(providerSource, /captcha\?:\s*VerifyCommentCaptchaInput \| null;/);
	assert.match(providerSource, /supportsVote:\s*boolean;/);
	assert.match(
		providerSource,
		/export type CommentPersistenceMode = "persistent" \| "preview_only";/,
	);
	assert.match(providerSource, /supportsCaptcha:\s*boolean;/);
	assert.match(providerSource, /requiredAuthorFields:\s*CommentAuthorField\[\];/);
	assert.match(providerSource, /export type CommentCaptchaChallenge = \{/);
	assert.match(providerSource, /export type CommentCaptchaState = \{/);
	assert.match(providerSource, /export type VerifyCommentCaptchaInput = \{/);
	assert.match(providerSource, /export type VoteCommentInput = \{/);
	assert.match(providerSource, /export type CommentSortBy = "date_desc" \| "date_asc";/);
	assert.match(providerSource, /export type GetCommentThreadInput = \{/);
	assert.match(providerSource, /sortBy\?: CommentSortBy;/);
	assert.match(providerSource, /limit\?: number;/);
	assert.match(providerSource, /offset\?: number;/);
	assert.match(providerSource, /export type CommentThreadPage = \{/);
	assert.match(providerSource, /rootsCount:\s*number;/);
	assert.match(providerSource, /totalCount:\s*number;/);
	assert.match(providerSource, /abstract createComment\(input: CreateCommentInput\)/);
	assert.match(
		providerSource,
		/abstract getThread\(input: GetCommentThreadInput\): Promise<CommentThreadPage>;/,
	);
	assert.match(providerSource, /async getCaptchaState\(\): Promise<CommentCaptchaState \| null>/);
	assert.match(
		providerSource,
		/async verifyCaptcha\(\s*_input: VerifyCommentCaptchaInput,\s*\): Promise<CommentCaptchaState>/,
	);
	assert.match(providerSource, /async voteComment\(_input: VoteCommentInput\): Promise<CanonicalComment>/);
	assert.match(typesConfigSource, /export type CommentConfig = \{/);
	assert.match(typesConfigSource, /provider\?: CommentProvider \| null;/);
	assert.match(typesConfigSource, /rootLimit\?: number;/);
	assert.match(typesConfigSource, /maxDepth\?: number;/);
	assert.match(typesConfigSource, /export type PageMetricsConfig = \{/);
	assert.match(typesConfigSource, /provider\?: PageMetricsProvider \| null;/);
	assert.match(defaultConfigSource, /export const defaultCommentConfig: CommentConfig = \{/);
	assert.match(defaultConfigSource, /enable: true/);
	assert.match(defaultConfigSource, /provider: mockCommentProvider/);
	assert.match(defaultConfigSource, /rootLimit: DEFAULT_COMMENT_ROOT_LIMIT/);
	assert.match(defaultConfigSource, /maxDepth: DEFAULT_COMMENT_MAX_DEPTH/);
	assert.match(defaultConfigSource, /export const defaultPageMetricsConfig: PageMetricsConfig = \{/);
	assert.match(appConfigSource, /export const commentConfig: CommentConfig =/);
	assert.match(appConfigSource, /export const pageMetricsConfig: PageMetricsConfig =/);
	assert.match(appConfigSource, /mergeCommentConfig\(/);
	assert.match(optionsSource, /export const DEFAULT_COMMENT_ROOT_LIMIT = 5;/);
	assert.match(optionsSource, /export const DEFAULT_COMMENT_MAX_DEPTH = 3;/);
	assert.match(optionsSource, /export const MIN_COMMENT_ROOT_LIMIT = 1;/);
	assert.match(optionsSource, /export const MIN_COMMENT_MAX_DEPTH = 1;/);
	assert.match(
		optionsSource,
		/DEFAULT_COMMENT_SORT_BY = "date_desc"/,
	);
	assert.match(optionsSource, /Math\.max\(minimum/);
});
