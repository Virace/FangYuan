import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
				assert.match(homeHtml, /href="\/archive\.html"/);
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

test(
	"file-family external sites render localized built-in nav links and matching pagination URLs",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ distRoot, postDir, siteAboutPath, siteConfigPath, markCreated }) => {
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: File Family Nav Demo
  subtitle: demo
  postsPerPage: 1
  lang: zh_CN
  permalink:
    postsPattern: /%slug%.html
    pagesPattern: /%slug%
    trailingSlash: never
    postPatternRules: []
    aliasValidation: error
    updatedDateMode: manual
    updatedDateFallback: none

navBarConfig:
  links:
    - name: nav.home
      url: /
    - name: nav.archive
      url: /archive/
    - name: nav.about
      ref:
        collection: spec
        id: about
`,
					"utf8",
				);

				for (const [index, title] of [
					"First",
					"Second",
					"Third",
					"Fourth",
					"Fifth",
					"Sixth",
				].entries()) {
					await writeFile(
						markCreated(path.join(postDir, `${title.toLowerCase()}.md`)),
						`---
title: ${title}
published: 2026-04-${String(21 + index).padStart(2, "0")}
description: demo
tags: [Demo]
category: Demo
draft: false
---
${title}
`,
						"utf8",
					);
				}
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

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
				await readFile(path.join(distRoot, "archive.html"), "utf8");
				await readFile(path.join(distRoot, "2.html"), "utf8");

				assert.match(homeHtml, /aria-label="主页"/);
				assert.match(homeHtml, /aria-label="归档"/);
				assert.match(homeHtml, /aria-label="关于"/);
				assert.match(homeHtml, /href="\/archive\.html"/);
				assert.match(homeHtml, /href="\/2\.html"/);
				assert.doesNotMatch(homeHtml, /nav\.home|nav\.archive|nav\.about/);
				assert.doesNotMatch(homeHtml, /href="\/archive\/"/);
				assert.doesNotMatch(homeHtml, /href="\/2\/"/);
			},
		);
	},
);

test(
	"external SVG favicons build to public asset URLs instead of filesystem paths",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({
				distRoot,
				fixtureRoot,
				postDir,
				siteAboutPath,
				siteConfigPath,
				markCreated,
			}) => {
				const imageDir = path.join(fixtureRoot, "assets", "images");
				await mkdir(imageDir, { recursive: true });
				await writeFile(
					path.join(imageDir, "favicon-light.svg"),
					'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#fff"/></svg>',
					"utf8",
				);
				await writeFile(
					path.join(imageDir, "favicon-dark.svg"),
					'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#000"/></svg>',
					"utf8",
				);
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: SVG Favicon Demo
  subtitle: demo
  banner:
    enable: false
  favicon:
    - src: assets/images/favicon-light.svg
      theme: light
    - src: assets/images/favicon-dark.svg
      theme: dark
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
				await writeFile(siteAboutPath, "# About\n", "utf8");

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
				const normalizedFixtureRoot = fixtureRoot.replaceAll("\\", "/");

				assert.match(homeHtml, /rel="icon"/);
				assert.doesNotMatch(homeHtml, new RegExp(normalizedFixtureRoot));
				assert.doesNotMatch(homeHtml, /assets\/images\/favicon-(?:light|dark)\.svg/);
			},
		);
	},
);
