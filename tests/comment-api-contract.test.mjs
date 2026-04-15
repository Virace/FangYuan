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

test("comment provider layer should remove FangYuan server gateway and stay static-build friendly", async () => {
	const [apiCapabilityExists, apiThreadExists, apiCreateExists, apiPendingExists, providerSource, clientSource] =
		await Promise.all([
			exists(path.join("src", "pages", "api", "comments", "capability.ts")),
			exists(path.join("src", "pages", "api", "comments", "thread.ts")),
			exists(path.join("src", "pages", "api", "comments", "create.ts")),
			exists(path.join("src", "pages", "api", "comments", "pending.ts")),
			readFile(path.join(repoRoot, "src", "utils", "comments", "provider.ts"), "utf8"),
			readFile(path.join(repoRoot, "src", "utils", "comments", "client.ts"), "utf8"),
		]);

	assert.equal(apiCapabilityExists, false);
	assert.equal(apiThreadExists, false);
	assert.equal(apiCreateExists, false);
	assert.equal(apiPendingExists, false);
	assert.match(providerSource, /export abstract class CommentProvider \{/);
	assert.match(providerSource, /readonly kind: string/);
	assert.match(providerSource, /supportsVote:\s*boolean;/);
	assert.match(providerSource, /export type CommentCaptchaChallenge = \{/);
	assert.match(providerSource, /kind:\s*string;/);
	assert.match(providerSource, /imageData\?:\s*string \| null;/);
	assert.match(providerSource, /html\?:\s*string \| null;/);
	assert.match(providerSource, /export type CommentCaptchaState = \{/);
	assert.match(providerSource, /required:\s*boolean;/);
	assert.match(providerSource, /verified:\s*boolean;/);
	assert.match(providerSource, /export type VerifyCommentCaptchaInput = \{/);
	assert.match(providerSource, /export class CommentCaptchaRequiredError extends Error \{/);
	assert.match(providerSource, /readonly state: CommentCaptchaState \| null;/);
	assert.match(providerSource, /export type VoteCommentInput = \{/);
	assert.match(providerSource, /export type CommentSortBy = "date_desc" \| "date_asc";/);
	assert.match(providerSource, /export type GetCommentThreadInput = \{/);
	assert.match(providerSource, /export type CommentThreadPage = \{/);
	assert.match(providerSource, /captcha\?:\s*VerifyCommentCaptchaInput \| null;/);
	assert.match(
		providerSource,
		/export function getCommentProvider\(config: \{[\s\S]*enable: boolean;[\s\S]*provider\?: CommentProvider \| null[\s\S]*\): CommentProvider \| null \{/,
	);
	assert.match(
		providerSource,
		/abstract getThread\(input: GetCommentThreadInput\): Promise<CommentThreadPage>;/,
	);
	assert.match(providerSource, /async getCaptchaState\(\): Promise<CommentCaptchaState \| null> \{/);
	assert.match(providerSource, /async refreshCaptcha\(\): Promise<CommentCaptchaState \| null> \{/);
	assert.match(providerSource, /async verifyCaptcha\(_input: VerifyCommentCaptchaInput\): Promise<CommentCaptchaState> \{/);
	assert.doesNotMatch(providerSource, /pending-token|PUBLIC_WP_API_BASE|PUBLIC_FANGYUAN_COMMENT_PROVIDER/);
	assert.doesNotMatch(providerSource, /@\/config/);
	assert.match(clientSource, /getCommentProvider\(commentConfig\)/);
	assert.match(clientSource, /buildCommentTree\(threadPage\.comments\)/);
	assert.match(clientSource, /async getThread\(input: GetCommentThreadInput\)/);
	assert.match(clientSource, /async getCaptchaState\(\)/);
	assert.match(clientSource, /async refreshCaptcha\(\)/);
	assert.match(clientSource, /async verifyCaptcha\(input: VerifyCommentCaptchaInput\)/);
	assert.match(clientSource, /async voteComment\(input: VoteCommentInput\)/);
});

test("browser-side direct providers should own reads and writes without a FangYuan gateway", async () => {
	const [providerSource, mockSource, wpSource, artalkSource, artalkCommentsSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "utils", "comments", "provider.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "comments", "mock-provider.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "comments", "wp-provider.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "comments", "artalk-provider.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "artalk", "comments.ts"), "utf8"),
	]);

	assert.match(providerSource, /abstract getCapability\(postKey: string\)/);
	assert.match(providerSource, /abstract createComment\(input: CreateCommentInput\)/);
	assert.match(mockSource, /export class MockCommentProvider extends CommentProvider \{/);
	assert.match(mockSource, /export const mockCommentProvider = new MockCommentProvider\(\)/);
	assert.match(wpSource, /export class WpCommentProvider extends CommentProvider \{/);
	assert.match(wpSource, /constructor\(config: WpCommentProviderConfig\)/);
	assert.match(wpSource, /this\.config\.apiBase/);
	assert.match(wpSource, /\/wp\/v2\/posts/);
	assert.match(wpSource, /\/wp\/v2\/comments/);
	assert.match(wpSource, /author_name/);
	assert.match(wpSource, /author_email/);
	assert.match(wpSource, /parent/);
	assert.match(artalkSource, /export class ArtalkCommentProvider extends CommentProvider \{/);
	assert.match(artalkSource, /constructor\(config: ArtalkCommentProviderConfig\)/);
	assert.match(artalkSource, /from "\.\.\/artalk\/comments"/);
	assert.match(artalkSource, /createArtalkCommentService\(/);
	assert.match(artalkCommentsSource, /sort_by/);
	assert.match(artalkCommentsSource, /offset/);
	assert.match(artalkCommentsSource, /limit/);
	assert.match(artalkCommentsSource, /roots_count/);
	assert.match(artalkCommentsSource, /totalCount/);
	assert.match(artalkCommentsSource, /\/api\/v2\/comments/);
	assert.match(artalkCommentsSource, /page_key/);
	assert.match(artalkCommentsSource, /site_name/);
	assert.match(artalkCommentsSource, /page_title/);
	assert.match(artalkCommentsSource, /email_encrypted/);
	assert.match(artalkCommentsSource, /is_pending/);
	assert.match(artalkCommentsSource, /is_allow_reply/);
});
