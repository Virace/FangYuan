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
	assert.match(
		providerSource,
		/export function getCommentProvider\(config: \{[\s\S]*enable: boolean;[\s\S]*provider\?: CommentProvider \| null[\s\S]*\): CommentProvider \| null \{/,
	);
	assert.doesNotMatch(providerSource, /challenge|pending-token|PUBLIC_WP_API_BASE|PUBLIC_FANGYUAN_COMMENT_PROVIDER/);
	assert.doesNotMatch(providerSource, /@\/config/);
	assert.match(clientSource, /getCommentProvider\(commentConfig\)/);
});

test("WordPress-compatible direct provider should own reads and writes from the browser", async () => {
	const [providerSource, mockSource, wpSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "utils", "comments", "provider.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "comments", "mock-provider.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "comments", "wp-provider.ts"), "utf8"),
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
});
