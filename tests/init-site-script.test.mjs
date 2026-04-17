import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ensureExternalSiteScaffold } from "../scripts/init-site.js";

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

	const result = ensureExternalSiteScaffold(tempRoot, {
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
		path.join(tempRoot, "site", "config.ts"),
		"utf8",
	);
	assert.match(
		siteConfigSource,
		/export const siteConfig = \{[\s\S]*title: "Virace Notes"/,
		"init-site should scaffold a site config template from explicit init options",
	);
	assert.match(
		siteConfigSource,
		/export const navBarConfig = \{/,
		"init-site should scaffold the navBarConfig section",
	);
	assert.match(
		siteConfigSource,
		/export const profileConfig = \{/,
		"init-site should scaffold the profileConfig section",
	);
	assert.match(
		siteConfigSource,
		/bio: "Personal notes"/,
		"init-site should scaffold the profile bio from explicit init options",
	);
	assert.match(
		siteConfigSource,
		/export const qingyanDevProxyTarget = "http:\/\/localhost:4401";/,
		"init-site should scaffold a literal QingYan dev proxy target when configured",
	);
	assert.match(
		siteConfigSource,
		/enable: true,\s+qingyan:/,
		"init-site should scaffold enabled QingYan-backed feature blocks",
	);
	assert.match(
		siteConfigSource,
		/rewardOptions:/,
		"init-site should scaffold reward options when placeholders are enabled",
	);

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

	ensureExternalSiteScaffold(tempRoot);

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
		path.join(tempRoot, "site", "config.ts"),
		'export const siteConfig = { title: "Existing Site" };\n',
		"utf8",
	);

	ensureExternalSiteScaffold(tempRoot);
	const secondRun = ensureExternalSiteScaffold(tempRoot);

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
		path.join(tempRoot, "site", "config.ts"),
		"utf8",
	);
	assert.equal(
		siteConfigSource,
		'export const siteConfig = { title: "Existing Site" };\n',
		"init-site should preserve an existing site/config.ts",
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

	const result = ensureExternalSiteScaffold(
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
		hasPath(path.join(tempRoot, "site", "config.ts")),
		false,
		"dry-run should not create site/config.ts",
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
				operation.mode === "write" &&
				operation.path === path.join(tempRoot, "site", "config.ts"),
		),
		true,
		"dry-run should report planned site/config.ts creation",
	);
});
