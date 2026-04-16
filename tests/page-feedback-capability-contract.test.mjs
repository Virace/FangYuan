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

test("page feedback capability plumbing should be explicit in provider and client", async () => {
	const [feedbackProviderSource, clientSource] = await Promise.all([
		readRepoFile("src", "utils", "page-feedback", "artalk-provider.ts"),
		readRepoFile("src", "utils", "page-feedback", "client.ts"),
	]);

	assert.match(feedbackProviderSource, /supportsLike:\s*true/);
	assert.match(clientSource, /async getCapability\(input: GetPageFeedbackInput\)/);
	assert.match(clientSource, /provider\.getCapability\(input\)/);
});
