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
	"build renders pinned chip on sticky homepage cards",
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
  title: Pinned Demo
  subtitle: demo
  postSort:
    key: updated
    order: desc
`,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");

				await writePost(
					postDir,
					markCreated,
					"pinned-home-demo.md",
					`---
title: Pinned Home Demo
published: 2024-01-01
updated: 2024-02-03
sticky: 1
description: demo
tags: [Demo]
category: Demo
draft: false
---
Pinned Home Demo
`,
				);
				await writePost(
					postDir,
					markCreated,
					"regular-home-demo.md",
					`---
title: Regular Home Demo
published: 2024-01-01
updated: 2024-02-01
description: demo
tags: [Demo]
category: Demo
draft: false
---
Regular Home Demo
`,
				);

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");

				assert.match(homeHtml, /(置顶|TOP)[\s\S]*Pinned Home Demo/);
			},
		);
	},
);
