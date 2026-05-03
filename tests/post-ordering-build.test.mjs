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
	"build applies sticky first and updated desc consistently across home archive rss and prev-next",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({
				siteConfigPath,
				postDir,
				siteAboutPath,
				distRoot,
				markCreated,
			}) => {
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Ordering Demo
  subtitle: demo
  site: https://ordering.example.test
  postSort:
    key: updated
    order: desc
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
					"sticky-alpha.md",
					`---
title: Sticky Alpha
published: 2024-01-01
updated: 2024-02-03
sticky: 1
description: demo
tags: [Demo]
category: Demo
draft: false
---
Sticky Alpha
`,
				);
				await writePost(
					postDir,
					markCreated,
					"sticky-beta.md",
					`---
title: Sticky Beta
published: 2024-01-01
updated: 2024-02-01
sticky: 1
description: demo
tags: [Demo]
category: Demo
draft: false
---
Sticky Beta
`,
				);
				await writePost(
					postDir,
					markCreated,
					"regular-gamma.md",
					`---
title: Regular Gamma
published: 2024-01-01
updated: 2024-03-01
description: demo
tags: [Demo]
category: Demo
draft: false
---
Regular Gamma
`,
				);
				await writePost(
					postDir,
					markCreated,
					"sticky-zero.md",
					`---
title: Sticky Zero
published: 2024-01-01
updated: 2024-02-02
sticky: 0
description: demo
tags: [Demo]
category: Demo
draft: false
---
Sticky Zero
`,
				);

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
				const archiveHtml = await readFile(
					path.join(distRoot, "archive", "index.html"),
					"utf8",
				);
				const rssXml = await readFile(path.join(distRoot, "rss.xml"), "utf8");
				const stickyAlphaHtml = await readFile(
					path.join(distRoot, "sticky-alpha", "index.html"),
					"utf8",
				);

				assert.match(
					homeHtml,
					/Sticky Alpha[\s\S]*Sticky Beta[\s\S]*Sticky Zero[\s\S]*Regular Gamma/,
				);
				assert.match(
					homeHtml,
					/href="\/sticky-zero\/"[\s\S]{0,1000}(置顶|TOP)[\s\S]{0,300}Sticky Zero/,
				);
				assert.match(
					archiveHtml,
					/Sticky Alpha[\s\S]*Sticky Beta[\s\S]*Sticky Zero[\s\S]*Regular Gamma/,
				);
				assert.match(
					rssXml,
					/Sticky Alpha[\s\S]*Sticky Beta[\s\S]*Sticky Zero[\s\S]*Regular Gamma/,
				);
				assert.match(stickyAlphaHtml, /href="\/sticky-beta\/"/);
			},
		);
	},
);

test(
	"build accepts title asc order inside the same sticky level",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({
				siteConfigPath,
				postDir,
				siteAboutPath,
				distRoot,
				markCreated,
			}) => {
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Ordering Demo
  subtitle: demo
  postSort:
    key: title
    order: asc
`,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");

				await writePost(
					postDir,
					markCreated,
					"zeta.md",
					`---
title: Zeta
published: 2024-01-01
sticky: 1
description: demo
tags: [Demo]
category: Demo
draft: false
---
Zeta
`,
				);
				await writePost(
					postDir,
					markCreated,
					"alpha.md",
					`---
title: Alpha
published: 2024-01-01
sticky: 1
description: demo
tags: [Demo]
category: Demo
draft: false
---
Alpha
`,
				);

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
				assert.match(homeHtml, /Alpha[\s\S]*Zeta/);
			},
		);
	},
);
