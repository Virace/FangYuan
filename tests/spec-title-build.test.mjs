import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { withMutableSiteFixture } from "./test-helpers/site-fixture.mjs";

async function readBuiltHtml(distRoot, ...segments) {
	return readFile(path.join(distRoot, ...segments, "index.html"), "utf8");
}

test(
	"spec pages prefer frontmatter title and keep built-in about fallback",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({
				siteConfigPath,
				siteAboutPath,
				specDir,
				distRoot,
				runExternalBuild,
			}) => {
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Spec Title Demo
  subtitle: demo
  permalink:
    postsPattern: /%path%/%slug%
    pagesPattern: /%slug%
    trailingSlash: auto
    postPatternRules: []
    aliasValidation: error
    updatedDateMode: manual
    updatedDateFallback: none
`,
					"utf8",
				);

				await writeFile(siteAboutPath, "# About fallback content\n", "utf8");
				await writeFile(
					path.join(specDir, "guestbook.md"),
					`---
title: Guestbook Title
published: 2026-06-09
alias: guestbook
---
Guestbook content
`,
					"utf8",
				);

				runExternalBuild();

				const guestbookHtml = await readBuiltHtml(distRoot, "guestbook");
				assert.match(
					guestbookHtml,
					/<title>Guestbook Title - Spec Title Demo<\/title>/,
				);

				const aboutHtml = await readBuiltHtml(distRoot, "about");
				assert.match(aboutHtml, /<title>关于 - Spec Title Demo<\/title>/);
			},
		);
	},
);
