import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";

import {
	runBuild,
	withMutableSiteFixture,
} from "./test-helpers/site-fixture.mjs";

test("global toc hard switch removes toc markup from post and spec pages", async (t) => {
	await withMutableSiteFixture(
		t,
		async ({ distRoot, postDir, siteAboutPath, siteConfigPath, markCreated }) => {
			const postPath = markCreated(path.join(postDir, "markdown.md"));

			await writeFile(
				siteConfigPath,
				`export const siteConfig = {
	toc: {
		enable: false,
		depth: 2,
	},
};
`,
				"utf8",
			);

			await writeFile(
				postPath,
				`---
title: Markdown
published: 2024-01-01
toc:
  enable: true
---

# Markdown

## Section
`,
				"utf8",
			);

			await writeFile(
				siteAboutPath,
				`---
published: 2024-01-01
toc:
  enable: true
---

# About

## Section
`,
				"utf8",
			);

			runBuild();

			const postHtml = await readFile(
				path.join(distRoot, "markdown", "index.html"),
				"utf8",
			);
			const aboutHtml = await readFile(
				path.join(distRoot, "about", "index.html"),
				"utf8",
			);

			assert.match(postHtml, /id="toc"/);
			assert.doesNotMatch(postHtml, /<table-of-contents/i);
			assert.match(aboutHtml, /id="toc"/);
			assert.doesNotMatch(aboutHtml, /<table-of-contents/i);
		},
	);
});

test("spec frontmatter can opt into toc when the global switch is on", async (t) => {
	await withMutableSiteFixture(
		t,
		async ({ distRoot, siteAboutPath, siteConfigPath }) => {
			await writeFile(
				siteConfigPath,
				`export const siteConfig = {
	toc: {
		enable: true,
		depth: 2,
	},
};
`,
				"utf8",
			);

			await writeFile(
				siteAboutPath,
				`---
published: 2024-01-01
toc:
  enable: true
  depth: 3
---

# About

## Section

### Deep Section
`,
				"utf8",
			);

			runBuild();

			const aboutHtml = await readFile(
				path.join(distRoot, "about", "index.html"),
				"utf8",
			);
			assert.match(aboutHtml, /<table-of-contents/i);
			assert.match(aboutHtml, /#section/i);
			assert.match(aboutHtml, /#deep-section/i);
		},
	);
});
