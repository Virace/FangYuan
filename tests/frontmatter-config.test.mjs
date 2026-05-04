import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, "frontmatter.json");

async function readFrontmatterConfig() {
	return JSON.parse(await readFile(configPath, "utf8"));
}

function getContentType(config, name) {
	return config["frontMatter.taxonomy.contentTypes"].find(
		(contentType) => contentType.name === name,
	);
}

function getFieldNames(contentType) {
	return contentType.fields.map((field) => field.name).filter(Boolean);
}

test("frontmatter.json registers internal posts and spec content folders", async () => {
	const config = await readFrontmatterConfig();

	assert.deepEqual(config["frontMatter.content.pageFolders"], [
		{
			title: "posts",
			path: "[[workspace]]/src/content/posts",
			contentTypes: ["default"],
		},
		{
			title: "spec",
			path: "[[workspace]]/src/content/spec",
			contentTypes: ["spec"],
		},
	]);
	assert.equal(config["frontMatter.content.publicFolder"], "src/assets");
});

test("frontmatter.json mirrors current FangYuan content frontmatter fields", async () => {
	const config = await readFrontmatterConfig();
	const postType = getContentType(config, "default");
	const specType = getContentType(config, "spec");

	assert.ok(postType, "posts content type should exist");
	assert.ok(specType, "spec content type should exist");
	assert.deepEqual(getFieldNames(postType), [
		"title",
		"description",
		"published",
		"updated",
		"alias",
		"permalink",
		"toc",
		"image",
		"tags",
		"category",
		"lang",
		"sticky",
		"draft",
		"comment",
	]);
	assert.deepEqual(getFieldNames(specType), [
		"alias",
		"permalink",
		"toc",
		"published",
		"updated",
		"comment",
	]);
	assert.equal(
		getFieldNames(postType).includes("language"),
		false,
		"legacy language field should not be used; FangYuan schema uses lang",
	);
});
