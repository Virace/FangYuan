import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { externalContentLoader } from "../src/utils/site-source/content-loader.ts";

async function withExternalContentContext(t, callback) {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-loader-"));
	const fangyuanRoot = path.join(tempRoot, "fangyuan");
	const siteRoot = path.join(tempRoot, "site");
	const contentRoot = path.join(siteRoot, "content");
	const previousMode = process.env.FANGYUAN_SITE_MODE;
	const previousSiteRoot = process.env.FANGYUAN_SITE_ROOT;
	const previousFangyuanRoot = process.env.FANGYUAN_ROOT;

	await mkdir(path.join(contentRoot, "spec"), { recursive: true });
	await writeFile(path.join(siteRoot, "site.config.yaml"), "siteConfig: {}\n");
	await writeFile(path.join(contentRoot, "spec", "about.md"), "# About\n");

	process.env.FANGYUAN_SITE_MODE = "external";
	process.env.FANGYUAN_SITE_ROOT = siteRoot;
	process.env.FANGYUAN_ROOT = fangyuanRoot;

	t.after(async () => {
		if (previousMode === undefined) {
			delete process.env.FANGYUAN_SITE_MODE;
		} else {
			process.env.FANGYUAN_SITE_MODE = previousMode;
		}

		if (previousSiteRoot === undefined) {
			delete process.env.FANGYUAN_SITE_ROOT;
		} else {
			process.env.FANGYUAN_SITE_ROOT = previousSiteRoot;
		}

		if (previousFangyuanRoot === undefined) {
			delete process.env.FANGYUAN_ROOT;
		} else {
			process.env.FANGYUAN_ROOT = previousFangyuanRoot;
		}

		await rm(tempRoot, { recursive: true, force: true });
	});

	await callback({
		contentRoot,
		fangyuanRoot,
		relativeEntryFilePath: "../site/content/spec/about.md",
	});
}

test("externalContentLoader preserves relative file paths written to the content store", async (t) => {
	await withExternalContentContext(t, async ({ relativeEntryFilePath }) => {
		let storedEntry;
		const loader = externalContentLoader({
			name: "fixture-loader",
			async load(context) {
				context.store.set({
					id: "about",
					data: {},
					filePath: relativeEntryFilePath,
				});
			},
		});

		await loader.load({
			store: {
				set(entry) {
					storedEntry = entry;
				},
			},
		});

		assert.equal(storedEntry.filePath, relativeEntryFilePath);
	});
});

test("externalContentLoader still exposes importer-ready file paths when reading existing entries", async (t) => {
	await withExternalContentContext(t, async ({ contentRoot, relativeEntryFilePath }) => {
		let observedEntry;
		const loader = externalContentLoader({
			name: "fixture-loader",
			async load(context) {
				observedEntry = context.store.get("about");
			},
		});

		await loader.load({
			store: {
				get() {
					return {
						id: "about",
						data: {},
						filePath: relativeEntryFilePath,
					};
				},
			},
		});

		assert.notEqual(observedEntry.filePath, relativeEntryFilePath);
		assert.match(observedEntry.filePath.replace(/\\/g, "/"), /\/site\/content\/spec\/about\.md$/);
		assert.equal(
			path.relative(contentRoot, observedEntry.filePath).startsWith(".."),
			false,
		);
	});
});
