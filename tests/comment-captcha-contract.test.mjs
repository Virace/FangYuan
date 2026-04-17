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

test("comment captcha contract should expose host modes instead of raw transport kinds", async () => {
	const providerSource = await readRepoFile(
		"src",
		"utils",
		"comments",
		"provider.ts",
	);

	assert.match(
		providerSource,
		/export type CommentCaptchaHostMode =[\s\S]*"inline_value"[\s\S]*"iframe_widget"[\s\S]*"token_widget"/,
	);
	assert.match(
		providerSource,
		/export type CommentCaptchaVerificationModel =[\s\S]*"backend_session"[\s\S]*"request_token"/,
	);
	assert.match(providerSource, /mode:\s*CommentCaptchaHostMode \| null;/);
	assert.match(
		providerSource,
		/verificationModel:\s*CommentCaptchaVerificationModel \| null;/,
	);
	assert.match(providerSource, /mode:\s*"inline_value";/);
	assert.match(providerSource, /mode:\s*"iframe_widget";/);
	assert.match(providerSource, /iframeSrc:\s*string;/);
	assert.match(
		providerSource,
		/export type VerifyCommentCaptchaInput = \{[\s\S]*mode:\s*"inline_value";[\s\S]*value:\s*string;[\s\S]*\}/,
	);
	assert.match(
		providerSource,
		/export class CommentCaptchaRequiredError extends Error \{/,
	);
});

test("QingYan client should keep captcha handling on backend session verification without provider adapters", async () => {
	const qingyanClientSource = await readRepoFile(
		"src",
		"utils",
		"qingyan",
		"client.ts",
	);

	assert.match(qingyanClientSource, /verificationModel:\s*"backend_session"/);
	assert.match(qingyanClientSource, /mode:\s*"inline_value"/);
	assert.match(qingyanClientSource, /challengeId/);
	assert.match(qingyanClientSource, /\/comments\/captcha\/state/);
	assert.match(qingyanClientSource, /\/comments\/captcha\/verify/);
	assert.match(qingyanClientSource, /"VOTE_CAPTCHA_REQUIRED"/);
	assert.match(qingyanClientSource, /createCaptchaRequiredError/);
	assert.match(
		qingyanClientSource,
		/async likePage[\s\S]*createCaptchaRequiredError/,
	);
	assert.doesNotMatch(qingyanClientSource, /iframeSrc:\s*build[A-Z]\w+/);
});
