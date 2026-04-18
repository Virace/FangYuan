import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { generatePaginationTestPosts } from "../scripts/generate-pagination-test-posts.js";

test("generatePaginationTestPosts keeps src/content/posts/test-pagination as the default output root", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-pagination-src-"));
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	const result = generatePaginationTestPosts({
		rootDir: tempRoot,
		count: 2,
		target: "src",
	});

	assert.equal(
		existsSync(path.join(tempRoot, "src", "content", "posts", "test-pagination", "pagination-test-01.md")),
		true,
		"the generator should still write into src/content/posts/test-pagination by default",
	);
	assert.equal(
		result.targetDir,
		path.join(tempRoot, "src", "content", "posts", "test-pagination"),
		"the returned target directory should point at the shared src content root",
	);
});

test("generatePaginationTestPosts can target site/content/posts/test-pagination for local external-site testing", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-pagination-site-"));
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	const result = generatePaginationTestPosts({
		rootDir: tempRoot,
		count: 3,
		target: "site",
	});

	const generatedPath = path.join(
		tempRoot,
		"site",
		"content",
		"posts",
		"test-pagination",
		"pagination-test-01.md",
	);

	assert.equal(
		existsSync(generatedPath),
		true,
		"the generator should write fixture posts into site/content/posts/test-pagination when target=site",
	);
	assert.equal(
		existsSync(path.join(tempRoot, "src", "content", "posts", "test-pagination", "pagination-test-01.md")),
		false,
		"site-targeted fixture generation should not leak files back into src/content",
	);
	assert.equal(
		result.targetDir,
		path.join(tempRoot, "site", "content", "posts", "test-pagination"),
		"the returned target directory should reflect the external site content root",
	);

	const firstPost = await readFile(generatedPath, "utf8");
	assert.match(
		firstPost,
		/^---[\s\S]*draft: false/m,
		"generated site fixture posts should keep the same frontmatter shape as the shared src fixtures",
	);
});
