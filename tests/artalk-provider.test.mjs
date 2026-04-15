import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

test("standalone Artalk core should own endpoint construction and relative browser-origin fallback", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "utils", "artalk", "core.ts"),
		"utf8",
	);

	assert.match(source, /export type ArtalkApiConfig = \{/);
	assert.match(
		source,
		/const baseOrigin =[\s\S]*typeof window !== "undefined" \? window\.location\.origin : "http:\/\/localhost";/,
		"relative /artalk-api bases should be resolved against the current browser origin inside the standalone Artalk core",
	);
	assert.match(
		source,
		/new URL\(`\$\{normalizedConfig\.apiBase\}\$\{pathname\}`, baseOrigin\);/,
		"Artalk core should pass the resolved base origin into new URL so relative apiBase values do not throw Invalid URL in the browser",
	);
	assert.match(source, /trimmed\.endsWith\("\/api\/v2"\) \? trimmed\.slice\(0, -7\) : trimmed/);
	assert.match(source, /console\.error\(/);
	assert.doesNotMatch(source, /Verify apiBase, siteName, and trusted origin\/CORS/);
});

test("standalone Artalk comments module should own raw comments and vote endpoints", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "utils", "artalk", "comments.ts"),
		"utf8",
	);

	assert.match(source, /export function createArtalkCommentsApi\(config: ArtalkApiConfig\)/);
	assert.match(source, /\/api\/v2\/comments\//);
	assert.match(source, /\/api\/v2\/comments\/\$\{commentId\}\//);
	assert.match(source, /\/api\/v2\/votes\/\$\{targetName\}\/\$\{targetId\}\//);
	assert.match(source, /\/api\/v2\/votes\/\$\{targetName\}\/\$\{targetId\}\/\$\{choice\}\//);
	assert.match(source, /page_key/);
	assert.match(source, /site_name/);
	assert.match(source, /sort_by/);
	assert.match(source, /offset/);
	assert.match(source, /limit/);
	assert.match(source, /page_title/);
	assert.match(source, /name:\s*input\.author\.name/);
	assert.match(source, /vote_up/);
	assert.match(source, /vote_down/);
	assert.match(source, /roots_count/);
	assert.match(source, /export function createArtalkCommentService\(/);
	assert.match(source, /supportsVote:\s*true/);
	assert.match(source, /renderPlainCommentHtml/);
});

test("standalone Artalk captcha module should own captcha status, image challenge, and verification endpoints", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "utils", "artalk", "captcha.ts"),
		"utf8",
	);

	assert.match(source, /export function createArtalkCaptchaApi\(config: ArtalkApiConfig\)/);
	assert.match(source, /\/api\/v2\/captcha\/status/);
	assert.match(source, /\/api\/v2\/captcha\//);
	assert.match(source, /\/api\/v2\/captcha\/verify/);
	assert.match(source, /credentials:\s*"include"/);
	assert.match(source, /img_data/);
	assert.match(source, /is_pass/);
	assert.match(source, /export function createArtalkCaptchaService\(/);
	assert.match(source, /kind:\s*"image"/);
	assert.match(source, /kind:\s*"html"/);
});

test("ArtalkCommentProvider should become a thin adapter over the standalone Artalk comments module", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "utils", "comments", "artalk-provider.ts"),
		"utf8",
	);

	assert.match(source, /from "\.\.\/artalk\/comments"/);
	assert.match(source, /from "\.\.\/artalk\/captcha"/);
	assert.match(source, /CommentCaptchaRequiredError/);
	assert.match(source, /createArtalkCommentService\(/);
	assert.match(source, /createArtalkCaptchaService\(/);
	assert.match(source, /return this\.artalkCommentService\.getCapability\(postKey\)/);
	assert.match(source, /return this\.artalkCommentService\.getThread\(input\)/);
	assert.match(source, /async refreshCaptcha\(\): Promise<CommentCaptchaState \| null>/);
	assert.match(source, /return this\.artalkCaptchaService\.refresh\(\)/);
	assert.match(source, /artalkCommentService\.createComment\(input\)/);
	assert.match(source, /looksLikeCaptchaRequired/);
	assert.match(source, /throw new CommentCaptchaRequiredError/);
	assert.match(source, /return this\.artalkCaptchaService\.getState\(\)/);
	assert.match(source, /return this\.artalkCaptchaService\.verify\(input\)/);
	assert.match(
		source,
		/async voteComment\(input: VoteCommentInput\) \{[\s\S]*artalkCommentService\.voteComment\(input\)[\s\S]*throw new CommentCaptchaRequiredError/,
	);
	assert.doesNotMatch(source, /async function fetchArtalkJson/);
	assert.doesNotMatch(source, /function normalizeArtalkDate/);
	assert.doesNotMatch(source, /function mapArtalkStatus/);
	assert.doesNotMatch(source, /function mapArtalkViewerVote/);
	assert.doesNotMatch(source, /function mapArtalkComment/);
	assert.doesNotMatch(source, /renderPlainCommentHtml/);
	assert.doesNotMatch(source, /CommentStatus/);
	assert.doesNotMatch(source, /ArtalkCommentRecord/);
	assert.doesNotMatch(source, /ArtalkVoteResponse/);
});
