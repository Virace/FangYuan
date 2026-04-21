import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
	runBuild,
	withMutableSiteFixture,
} from "./test-helpers/site-fixture.mjs";

test(
	"navbar ref links and profile about link follow current spec public paths",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ siteConfigPath, siteAboutPath, specDir, distRoot }) => {
				await writeFile(
					siteConfigPath,
					`export const siteConfig = {
  title: "Nav Demo",
  subtitle: "demo",
  permalink: {
    postsPattern: "/%path%/%slug%.html",
    pagesPattern: "/%slug%.html",
    trailingSlash: "auto",
    postPatternRules: [],
    aliasValidation: "error",
    updatedDateMode: "manual",
    updatedDateFallback: "none",
  },
};

export const navBarConfig = {
  links: [
    {
      name: "Home",
      url: "/",
    },
    {
      name: "About",
      ref: {
        collection: "spec",
        id: "about",
      },
    },
    {
      name: "AAA",
      ref: {
        collection: "spec",
        id: "aaa",
      },
    },
  ],
};`,
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
				assert.match(homeHtml, /href="\/about\.html"/);
				assert.match(homeHtml, /href="\/bbb\.html"/);
			},
		);
	},
);

test(
	"build fails with explicit about error when spec about content is missing",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ siteAboutPath, siteConfigPath }) => {
				await writeFile(
					siteConfigPath,
					`export const siteConfig = {
  title: "Broken About Demo",
  subtitle: "demo",
  permalink: {
    postsPattern: "/%path%/%slug%.html",
    pagesPattern: "/%slug%.html",
    trailingSlash: "auto",
    postPatternRules: [],
    aliasValidation: "error",
    updatedDateMode: "manual",
    updatedDateFallback: "none",
  },
};

export const navBarConfig = {
  links: [
    {
      name: "About",
      ref: {
        collection: "spec",
        id: "about",
      },
    },
  ],
};`,
					"utf8",
				);

				await rm(siteAboutPath, { force: true });

				const result = runBuild(1);
				assert.match(result.stdout + result.stderr, /About page content not found/);
			},
		);
	},
);
