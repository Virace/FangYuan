import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { withMutableSiteFixture } from "./test-helpers/site-fixture.mjs";

async function writePost(postDir, markCreated, relativePath, source) {
	const absolutePath = markCreated(path.join(postDir, relativePath));
	await mkdir(path.dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, source, "utf8");
}

function countMatches(source, pattern) {
	return [...source.matchAll(pattern)].length;
}

test(
	"build renders bilibili video, link cards, and link grids",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({
				siteConfigPath,
				siteAboutPath,
				postDir,
				distRoot,
				markCreated,
				runExternalBuild,
			}) => {
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Markdown Media Demo
  subtitle: demo
  permalink:
    postsPattern: /%slug%
    pagesPattern: /%slug%
    trailingSlash: auto
    postPatternRules: []
    aliasValidation: error
    updatedDateMode: manual
    updatedDateFallback: none
`,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writePost(
					postDir,
					markCreated,
					"markdown-media-link-card-demo.md",
					`---
title: Markdown Media Link Card Demo
published: 2026-05-04
updated: 2026-05-04
description: demo
tags: [demo]
category: Demo
draft: false
---

::bilibili{bvid="BV1xx411c7mD" p="2" title="演示视频"}

::bilibili{bvid="bad"}

::link-card{url="https://example.com" title="Example Site" description="A site without manual logo."}

::link-card{url="/about" title="About Page" description="Internal link card."}

::link-card{url="https://logo.example.com" title="Logo Site" description="A site with remote logo." logo="https://logo.example.com/logo.svg"}

::link-card{url="https://asset.example.com" title="Asset Logo" description="Should be rejected in phase one." logo="assets/friends/example-logo.svg"}

::link-card{url="javascript:alert(1)" title="Bad Site" description="Should not become a link."}

:::link-grid
::link-card{url="https://example-a.com" title="Example A" description="First site."}

::link-card{url="https://example-b.com" title="Example B" description="Second site."}
:::
`,
				);

				runExternalBuild();

				const articleHtml = await readFile(
					path.join(distRoot, "markdown-media-link-card-demo", "index.html"),
					"utf8",
				);

				assert.match(articleHtml, /<figure(?=[^>]*md-bilibili)[^>]*>/);
				assert.match(
					articleHtml,
					/player\.bilibili\.com\/player\.html\?bvid=BV1xx411c7mD(?:&amp;|&#x26;)p=2/,
				);
				assert.match(articleHtml, /title="演示视频"/);
				assert.match(articleHtml, /loading="lazy"/);
				assert.match(articleHtml, /allowfullscreen/);
				assert.doesNotMatch(
					articleHtml,
					/player\.bilibili\.com\/player\.html\?bvid=bad/,
				);
				assert.match(
					articleHtml,
					/data-md-directive-error="Invalid bilibili bvid"/,
				);

				assert.match(
					articleHtml,
					/<a(?=[^>]*card-link)(?=[^>]*href="https:\/\/example\.com")(?=[^>]*target="_blank")(?=[^>]*rel="noopener noreferrer")[^>]*>/,
				);
				assert.match(
					articleHtml,
					/src="https:\/\/favicon\.im\/example\.com\?larger=true"/,
				);
				assert.match(
					articleHtml,
					/<a(?=[^>]*card-link)(?=[^>]*href="\/about")(?![^>]*target="_blank")[^>]*>/,
				);
				assert.match(
					articleHtml,
					/<img(?=[^>]*lc-logo)(?=[^>]*src="https:\/\/logo\.example\.com\/logo\.svg")[^>]*>/,
				);
				assert.doesNotMatch(articleHtml, /assets\/friends\/example-logo\.svg/);
				assert.match(
					articleHtml,
					/data-md-directive-error="Invalid link-card logo"/,
				);
				assert.doesNotMatch(articleHtml, /href="javascript:alert\(1\)"/);
				assert.match(
					articleHtml,
					/data-md-directive-error="Invalid link-card url"/,
				);

				assert.match(articleHtml, /<div(?=[^>]*md-link-grid)[^>]*>/);
				assert.ok(countMatches(articleHtml, /class="[^"]*card-link/g) >= 3);
				assert.doesNotMatch(
					articleHtml,
					/::bilibili|::link-card|:::link-grid/,
				);
			},
		);
	},
);
