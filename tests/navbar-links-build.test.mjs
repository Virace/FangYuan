import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
	runBuild,
	withMutableSiteFixture,
} from "./test-helpers/site-fixture.mjs";

test(
	"navbar links support LinkPresets import, same-name About override, and custom nav i18n",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ siteConfigPath, siteAboutPath, specDir, distRoot }) => {
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Nav Demo
  subtitle: demo
  permalink:
    postsPattern: /%path%/%slug%.html
    pagesPattern: /%slug%.html
    trailingSlash: auto
    postPatternRules: []
    aliasValidation: error
    updatedDateMode: manual
    updatedDateFallback: none

navBarI18n:
  nav.spec.aaa: 文档
  nav.repo: 代码仓库

navBarConfig:
  links:
    - name: nav.archive
      url: /archive/
    - name: about
      ref:
        collection: spec
        id: aaa
    - name: nav.spec.aaa
      ref:
        collection: spec
        id: aaa
    - id: nav.github
      name: nav.repo
      url: https://example.com/repo
      external: true
`,
					"utf8",
				);

				await writeFile(
					siteAboutPath,
					`---
title: About
published: 2026-04-21
---
About content
`,
					"utf8",
				);

				await writeFile(
					path.join(specDir, "aaa.md"),
					`---
title: AAA
published: 2026-04-21
alias: bbb
---
AAA content
`,
					"utf8",
				);

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
				assert.match(homeHtml, /href="\/archive\/"/);
				assert.match(homeHtml, /href="\/bbb\.html"/);
				assert.match(homeHtml, /aria-label="关于"/);
				assert.match(homeHtml, /aria-label="文档"/);
				assert.match(homeHtml, /aria-label="代码仓库"/);
				assert.doesNotMatch(homeHtml, /href="\/about\.html"/);
			},
		);
	},
);

test(
	"build falls back to default about route when external about content is missing",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ distRoot, siteAboutPath, siteConfigPath, postDir, markCreated }) => {
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Broken About Demo
  subtitle: demo
  permalink:
    postsPattern: /%path%/%slug%.html
    pagesPattern: /%slug%.html
    trailingSlash: auto
    postPatternRules: []
    aliasValidation: error
    updatedDateMode: manual
    updatedDateFallback: none

navBarConfig:
  links:
    - name: nav.archive
      url: /archive/
`,
					"utf8",
				);

				await writeFile(
					markCreated(path.join(postDir, "probe.md")),
					`---
title: Probe
published: 2026-04-21
description: demo
tags: [Demo]
category: Demo
draft: false
---
Probe
`,
					"utf8",
				);
				await rm(siteAboutPath, { force: true });

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
				const aboutHtml = await readFile(
					path.join(distRoot, "about.html"),
					"utf8",
				);

				assert.match(homeHtml, /href="\/about\.html"/);
				assert.match(aboutHtml, /About/i);
			},
		);
	},
);
