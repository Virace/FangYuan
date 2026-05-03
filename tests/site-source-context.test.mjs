import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveSiteSourceContext } from "../src/utils/site-source/context.ts";

test("internal mode ignores external site root", () => {
	const context = resolveSiteSourceContext({
		cwd: path.resolve("fixtures", "repo"),
		env: {
			FANGYUAN_SITE_MODE: "internal",
			FANGYUAN_SITE_ROOT: path.resolve("..", "fixture-sites", "custom-site"),
		},
	});

	assert.equal(context.mode, "internal");
	assert.equal(context.useExternalContent, false);
	assert.equal(context.useExternalConfig, false);
	assert.equal(context.contentRoot, "./src/content");
});

test("auto mode uses external site only when content exists", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-context-"));
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(tempRoot, "content", "posts"), { recursive: true });
	await writeFile(
		path.join(tempRoot, "content", "posts", "hello.md"),
		"# hello\n",
		"utf8",
	);

	const context = resolveSiteSourceContext({
		cwd: path.resolve("fixtures", "repo"),
		env: {
			FANGYUAN_SITE_MODE: "auto",
			FANGYUAN_SITE_ROOT: tempRoot,
		},
	});

	assert.equal(context.mode, "auto");
	assert.equal(context.useExternalContent, true);
	assert.equal(context.contentRoot, path.join(tempRoot, "content"));
});

test("external mode fails fast when site root is missing", () => {
	assert.throws(
		() =>
			resolveSiteSourceContext({
				cwd: path.resolve("fixtures", "repo"),
				env: {
					FANGYUAN_SITE_MODE: "external",
					FANGYUAN_SITE_ROOT: path.join(
						os.tmpdir(),
						"fangyuan-missing-site-root",
					),
				},
			}),
		/external site root/i,
	);
});

test("relative external site roots resolve from FangYuan root", async (t) => {
	const fangyuanRoot = await mkdtemp(
		path.join(os.tmpdir(), "fangyuan-root-context-"),
	);
	t.after(async () => {
		await rm(fangyuanRoot, { recursive: true, force: true });
	});

	const siteRoot = path.join(fangyuanRoot, "site");
	await mkdir(path.join(siteRoot, "content", "posts"), { recursive: true });
	await writeFile(
		path.join(siteRoot, "content", "posts", "hello.md"),
		"# hello\n",
		"utf8",
	);
	await writeFile(path.join(siteRoot, "site.config.yaml"), "siteConfig: {}\n");

	const context = resolveSiteSourceContext({
		fangyuanRoot,
		env: {
			FANGYUAN_SITE_MODE: "external",
			FANGYUAN_SITE_ROOT: "site",
		},
	});

	assert.equal(context.siteRoot, siteRoot);
	assert.equal(context.contentRoot, path.join(siteRoot, "content"));
	assert.equal(
		context.externalConfigPath,
		path.join(siteRoot, "site.config.yaml"),
	);
});
