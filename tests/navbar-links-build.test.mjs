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
					`import { LinkPresets } from "../src/constants/link-presets";

export const siteConfig = {
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

export const navBarI18n = {
  "nav.spec.aaa": "文档",
  "nav.repo": "代码仓库",
};

export const navBarConfig = {
  links: [
    LinkPresets.Archive,
    {
      name: "about",
      ref: {
        collection: "spec",
        id: "aaa",
      },
    },
    {
      name: "nav.spec.aaa",
      ref: {
        collection: "spec",
        id: "aaa",
      },
    },
    {
      id: "nav.github",
      name: "nav.repo",
      url: "https://example.com/repo",
      external: true,
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
	"build fails with explicit about error when spec about content is missing",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ siteAboutPath, siteConfigPath }) => {
				await writeFile(
					siteConfigPath,
					`import { LinkPresets } from "../src/constants/link-presets";

export const siteConfig = {
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
    LinkPresets.Archive,
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
