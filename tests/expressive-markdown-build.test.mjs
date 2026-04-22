import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { runBuild, withMutableSiteFixture } from "./test-helpers/site-fixture.mjs";

async function writePost(postDir, markCreated, relativePath, source) {
	const absolutePath = markCreated(path.join(postDir, relativePath));
	await mkdir(path.dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, source, "utf8");
}

test(
	"build renders expressive markdown primitives as stable semantic html",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ siteConfigPath, siteAboutPath, postDir, distRoot, markCreated }) => {
				await writeFile(
					siteConfigPath,
					`export const siteConfig = {
  title: "Expressive Markdown Demo",
  subtitle: "demo",
  permalink: {
    postsPattern: "/%slug%",
    pagesPattern: "/%slug%",
    trailingSlash: "auto",
    postPatternRules: [],
    aliasValidation: "error",
    updatedDateMode: "manual",
    updatedDateFallback: "none",
  },
};`,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writePost(
					postDir,
					markCreated,
					"expressive-markdown-demo.md",
					`---
title: Expressive Markdown Demo
published: 2024-04-23
updated: 2024-04-23
description: demo
tags: [demo]
category: Demo
draft: false
---

Before :hl[Important]{tone="warning"} after.

:::aside
This is supporting context.
:::

:::fold{title="More" icon="bookmark" open="true"}
Hidden body.
:::

:::fold{title="Plain" icon="none"}
No icon body.
:::
`,
				);

				runBuild();

				const articleHtml = await readFile(
					path.join(distRoot, "expressive-markdown-demo", "index.html"),
					"utf8",
				);

				assert.match(
					articleHtml,
					/<mark(?=[^>]*md-highlight)(?=[^>]*tone-warning)[^>]*>Important<\/mark>/,
				);
				assert.match(
					articleHtml,
					/<aside(?=[^>]*md-aside)[^>]*>[\s\S]*This is supporting context\./,
				);
				assert.match(
					articleHtml,
					/<div(?=[^>]*md-fold)(?=[^>]*data-icon="bookmark")(?=[^>]*data-open="true")[^>]*>/,
				);
				assert.match(
					articleHtml,
					/<label(?=[^>]*md-fold-summary)[^>]*>More<\/label>/,
				);
				assert.doesNotMatch(
					articleHtml,
					/<div(?=[^>]*md-fold)(?=[^>]*data-icon="none")(?=[^>]*data-open="true")[^>]*>/,
				);
				assert.match(
					articleHtml,
					/<div(?=[^>]*md-fold)(?=[^>]*data-icon="none")(?=[^>]*data-open="false")[^>]*>/,
				);
				assert.match(
					articleHtml,
					/<label(?=[^>]*md-fold-summary)[^>]*>Plain<\/label>/,
				);
				assert.match(
					articleHtml,
					/<div(?=[^>]*md-fold-body-inner)[^>]*>\s*<p>Hidden body\.<\/p>/,
				);
				assert.match(
					articleHtml,
					/<div(?=[^>]*md-fold-body-inner)[^>]*>\s*<p>No icon body\.<\/p>/,
				);
				assert.equal(
					[...articleHtml.matchAll(/<input(?=[^>]*md-fold-toggle)(?=[^>]*checked(?:="checked")?)[^>]*>/g)]
						.length,
					1,
				);
				assert.doesNotMatch(articleHtml, /:hl\[|:::fold|:::aside|<hl\b|<fold\b/);
			},
		);
	},
);
