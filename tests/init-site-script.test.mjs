import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ensureExternalSiteScaffold } from "../scripts/site/init-site.js";

function hasPath(targetPath) {
	return existsSync(targetPath);
}

test("ensureExternalSiteScaffold creates the external site skeleton and a demo post for a fresh site", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-site-"));
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(tempRoot, "src", "content", "spec"), {
		recursive: true,
	});
	await writeFile(
		path.join(tempRoot, "src", "content", "spec", "about.md"),
		"# About\n",
		"utf8",
	);

	const result = await ensureExternalSiteScaffold(tempRoot, {
		siteTitle: "Virace Notes",
		siteSubtitle: "QingYan ready",
		profileName: "Virace",
		profileBio: "Personal notes",
		qingyanSiteKey: "virace-notes",
		qingyanApiBase: "/api",
		qingyanDevProxyTarget: "http://localhost:4401",
		enableComments: true,
		enablePageMetrics: true,
		enablePageFeedback: true,
		includeRewardPlaceholders: true,
	});

	assert.equal(
		hasPath(path.join(tempRoot, "site", "content", "posts")),
		true,
		"init-site should create site/content/posts",
	);
	assert.equal(
		hasPath(path.join(tempRoot, "site", "content", "spec")),
		true,
		"init-site should create site/content/spec",
	);
	assert.equal(
		hasPath(path.join(tempRoot, "site", "assets")),
		true,
		"init-site should create site/assets",
	);
	assert.equal(
		hasPath(path.join(tempRoot, "site", "assets", "README.md")),
		true,
		"init-site should document the safe external asset directory",
	);
	assert.equal(
		hasPath(path.join(tempRoot, "site", "content", "spec", "about.md")),
		true,
		"init-site should copy the default about.md into site/content/spec",
	);
	assert.equal(
		hasPath(path.join(tempRoot, "site", "content", "posts", "welcome.md")),
		true,
		"init-site should scaffold a demo post into site/content/posts for a fresh site",
	);

	const aboutContent = await readFile(
		path.join(tempRoot, "site", "content", "spec", "about.md"),
		"utf8",
	);
	assert.equal(
		aboutContent,
		"# About\n",
		"init-site should preserve the default about.md contents when copying",
	);

	const siteConfigSource = await readFile(
		path.join(tempRoot, "site", "site.config.yaml"),
		"utf8",
	);
	assert.match(siteConfigSource, /title: "?Virace Notes"?/);
	assert.match(siteConfigSource, /profileConfig:[\s\S]*name: "?Virace"?/);
	assert.match(
		siteConfigSource,
		/qingyanDevProxyTarget: "?http:\/\/localhost:4401"?/,
	);
	assert.match(siteConfigSource, /永久链接规则/);
	assert.match(siteConfigSource, /安全本地写法：assets\/images\/banner.webp/);
	assert.match(siteConfigSource, /navBarConfig:/);
	assert.match(siteConfigSource, /pageFeedbackConfig:/);

	const assetsReadmeSource = await readFile(
		path.join(tempRoot, "site", "assets", "README.md"),
		"utf8",
	);
	assert.match(assetsReadmeSource, /site\/assets/);
	assert.match(assetsReadmeSource, /assets\/images\/banner\.webp/);

	const demoPostSource = await readFile(
		path.join(tempRoot, "site", "content", "posts", "welcome.md"),
		"utf8",
	);
	assert.match(
		demoPostSource,
		/^---[\s\S]*title: Welcome to Virace Notes/m,
		"init-site should scaffold a welcome post from explicit init options",
	);

	assert.equal(
		result.createdDirectories.length >= 3,
		true,
		"init-site should report the directories it created",
	);
	assert.equal(
		result.createdFiles.length >= 2,
		true,
		"init-site should report the files it created",
	);
});

test("ensureExternalSiteScaffold treats an empty site directory as a fresh site and scaffolds the demo post", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-site-"));
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(tempRoot, "src", "content", "spec"), {
		recursive: true,
	});
	await writeFile(
		path.join(tempRoot, "src", "content", "spec", "about.md"),
		"# About\n",
		"utf8",
	);
	await mkdir(path.join(tempRoot, "site"), {
		recursive: true,
	});

	await ensureExternalSiteScaffold(tempRoot);

	assert.equal(
		hasPath(path.join(tempRoot, "site", "content", "posts", "welcome.md")),
		true,
		"init-site should scaffold a demo post when the existing site directory is still empty",
	);
});

test("ensureExternalSiteScaffold is idempotent and preserves existing user files without injecting demo content", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-site-"));
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(tempRoot, "src", "content", "spec"), {
		recursive: true,
	});
	await writeFile(
		path.join(tempRoot, "src", "content", "spec", "about.md"),
		"# Default About\n",
		"utf8",
	);
	await mkdir(path.join(tempRoot, "site", "content", "spec"), {
		recursive: true,
	});
	await writeFile(
		path.join(tempRoot, "site", "content", "spec", "about.md"),
		"# Custom About\n",
		"utf8",
	);
	await writeFile(
		path.join(tempRoot, "site", "site.config.yaml"),
		"siteConfig:\n  title: Existing Site\n",
		"utf8",
	);

	await ensureExternalSiteScaffold(tempRoot);
	const secondRun = await ensureExternalSiteScaffold(tempRoot);

	const aboutContent = await readFile(
		path.join(tempRoot, "site", "content", "spec", "about.md"),
		"utf8",
	);
	assert.equal(
		aboutContent,
		"# Custom About\n",
		"init-site should preserve an existing custom about.md",
	);

	const siteConfigSource = await readFile(
		path.join(tempRoot, "site", "site.config.yaml"),
		"utf8",
	);
	assert.equal(
		siteConfigSource,
		"siteConfig:\n  title: Existing Site\n",
		"init-site should preserve an existing site.config.yaml",
	);

	assert.equal(
		secondRun.createdFiles.length,
		0,
		"running init-site twice should not recreate files",
	);
	assert.equal(
		hasPath(path.join(tempRoot, "site", "content", "posts", "welcome.md")),
		false,
		"init-site should not inject demo posts into an existing non-empty site",
	);
});

test("ensureExternalSiteScaffold dry-run reports planned actions without writing files", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-site-"));
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(tempRoot, "src", "content", "spec"), {
		recursive: true,
	});
	await writeFile(
		path.join(tempRoot, "src", "content", "spec", "about.md"),
		"# About\n",
		"utf8",
	);

	const result = await ensureExternalSiteScaffold(
		tempRoot,
		{
			siteTitle: "Dry Run Site",
			siteSubtitle: "Preview",
			profileName: "Previewer",
			profileBio: "No writes",
			qingyanSiteKey: "dry-run-site",
			qingyanApiBase: "/api",
			qingyanDevProxyTarget: "http://localhost:4401",
			enableComments: true,
			enablePageMetrics: true,
			enablePageFeedback: false,
			includeRewardPlaceholders: false,
		},
		{ dryRun: true },
	);

	assert.equal(
		hasPath(path.join(tempRoot, "site", "content", "posts")),
		false,
		"dry-run should not create site/content/posts",
	);
	assert.equal(
		hasPath(path.join(tempRoot, "site", "site.config.yaml")),
		false,
		"dry-run should not create site.config.yaml",
	);
	assert.equal(
		result.createdDirectories.length,
		0,
		"dry-run should not report created directories",
	);
	assert.equal(
		result.createdFiles.length,
		0,
		"dry-run should not report created files",
	);
	assert.equal(result.dryRun, true, "dry-run result should expose dryRun mode");
	assert.equal(
		result.operations.some(
			(operation) =>
				operation.kind === "directory" &&
				operation.status === "planned" &&
				operation.path === path.join(tempRoot, "site", "content", "posts"),
		),
		true,
		"dry-run should report planned directory creation",
	);
	assert.equal(
		result.operations.some(
			(operation) =>
				operation.kind === "file" &&
				operation.status === "planned" &&
				operation.mode === "copy" &&
				operation.path === path.join(tempRoot, "site", "site.config.yaml") &&
				operation.sourcePath?.endsWith(
					path.join("scripts", "site", "template.config.yaml"),
				),
		),
		true,
		"dry-run should report template-based site.config.yaml creation",
	);
});

test("ensureExternalSiteScaffold can scaffold into a custom site root", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-site-"));
	const customSiteRoot = path.join(tempRoot, ".temp", "demo-site");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(tempRoot, "src", "content", "spec"), {
		recursive: true,
	});
	await writeFile(
		path.join(tempRoot, "src", "content", "spec", "about.md"),
		"# About\n",
		"utf8",
	);

	await ensureExternalSiteScaffold(tempRoot, {}, { siteRoot: customSiteRoot });

	assert.equal(hasPath(path.join(customSiteRoot, "site.config.yaml")), true);
	assert.equal(
		hasPath(path.join(customSiteRoot, "content", "spec", "about.md")),
		true,
	);
});

test("ensureExternalSiteScaffold can seed external content from src/content", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-site-"));
	const customSiteRoot = path.join(tempRoot, ".temp", "seeded-site");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(tempRoot, "src", "content", "spec"), {
		recursive: true,
	});
	await mkdir(path.join(tempRoot, "src", "content", "posts"), {
		recursive: true,
	});
	await writeFile(
		path.join(tempRoot, "src", "content", "spec", "about.md"),
		"# About\n",
		"utf8",
	);
	await writeFile(
		path.join(tempRoot, "src", "content", "posts", "hello.md"),
		"# Hello\n",
		"utf8",
	);

	await ensureExternalSiteScaffold(tempRoot, {}, {
		siteRoot: customSiteRoot,
		seedFromSrcContent: true,
	});

	assert.equal(
		hasPath(path.join(customSiteRoot, "content", "posts", "hello.md")),
		true,
	);
});
