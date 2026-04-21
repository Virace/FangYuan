import assert from "node:assert/strict";
import { mkdir, readFile, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
	runBuild,
	withMutableSiteFixture,
} from "./test-helpers/site-fixture.mjs";

test(
	"html pattern plus always materializes to html directory output",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ siteConfigPath, postDir, siteAboutPath, distRoot }) => {
				await writeFile(
					siteConfigPath,
					`export const siteConfig = {
  title: "HTML Slash Demo",
  subtitle: "demo",
  permalink: {
    postsPattern: "/articles/%slug%.html",
    pagesPattern: "/%slug%",
    trailingSlash: "always",
    postPatternRules: [],
    aliasValidation: "error",
    updatedDateMode: "manual",
    updatedDateFallback: "none",
  },
};`,
					"utf8",
				);

				await writeFile(
					path.join(postDir, "index.md"),
					`---
title: Hello
published: 2026-04-21
alias: hello-world
description: demo
tags: [Demo]
category: Demo
draft: false
---
Hello world
`,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
				const articleHtml = await readFile(
					path.join(distRoot, "articles", "hello-world.html", "index.html"),
					"utf8",
				);

				assert.match(homeHtml, /href="\/articles\/hello-world\.html\/"/);
				assert.match(articleHtml, /Hello world/);
			},
		);
	},
);

test(
	"directory rule can override the global %path% pattern within the same materialization family",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ siteConfigPath, postDir, siteAboutPath, distRoot }) => {
				await writeFile(
					siteConfigPath,
					`export const siteConfig = {
  title: "Rule Demo",
  subtitle: "demo",
  permalink: {
    postsPattern: "/%path%/%slug%",
    pagesPattern: "/%slug%",
    trailingSlash: "auto",
    postPatternRules: [
      { match: "wp/**", pattern: "/%year%/%monthnum%/%day%/%slug%" },
    ],
    aliasValidation: "error",
    updatedDateMode: "manual",
    updatedDateFallback: "none",
  },
};`,
					"utf8",
				);

				const nestedDir = path.join(postDir, "wp", "foo");
				await mkdir(nestedDir, { recursive: true });
				await writeFile(
					path.join(nestedDir, "index.md"),
					`---
title: Rule Demo
published: 2026-04-21
description: demo
tags: [Demo]
category: Demo
draft: false
---
Rule demo
`,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");

				runBuild();

				const articleHtml = await readFile(
					path.join(distRoot, "2026", "04", "21", "foo", "index.html"),
					"utf8",
				);
				assert.match(articleHtml, /Rule demo/);
			},
		);
	},
);

test(
	"git mode falls back to filesystem updated date and renders it on article pages",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ siteConfigPath, postDir, siteAboutPath, distRoot }) => {
				const fixedUpdatedDate = new Date("2025-01-05T00:00:00.000Z");
				const postPath = path.join(postDir, "updated-probe.md");

				await writeFile(
					siteConfigPath,
					`export const siteConfig = {
  title: "Updated Probe",
  subtitle: "demo",
  permalink: {
    postsPattern: "/%path%/%slug%",
    pagesPattern: "/%slug%",
    trailingSlash: "auto",
    postPatternRules: [],
    aliasValidation: "error",
    updatedDateMode: "git",
    updatedDateFallback: "filesystem",
  },
};`,
					"utf8",
				);

				await writeFile(
					postPath,
					`---
title: Updated Probe
published: 2024-01-01
alias: updated-probe
description: demo
tags: [Demo]
category: Demo
draft: false
---
Updated content
`,
					"utf8",
				);
				await utimes(postPath, fixedUpdatedDate, fixedUpdatedDate);
				await writeFile(siteAboutPath, "# About\n", "utf8");

				runBuild();

				const articleHtml = await readFile(
					path.join(distRoot, "updated-probe", "index.html"),
					"utf8",
				);

				assert.match(articleHtml, /2024-01-01/);
				assert.match(articleHtml, /2025-01-05/);
			},
		);
	},
);
