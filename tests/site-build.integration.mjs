import assert from "node:assert/strict";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createBuildRun } from "./test-helpers/build-artifact.mjs";

const tinyBlueSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><rect width="4" height="4" fill="#0ea5e9"/></svg>';
const tinyOrangeSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><rect width="4" height="4" fill="#f97316"/></svg>';
const tinyPng = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAG0lEQVR4nGP8z8AARLJgwiYGdggIjwUA2d0CBYzN2M8AAAAASUVORK5CYII=",
	"base64",
);
const optimizedAssetPattern = /\/static\/.*\.(?:png|webp|jpg|jpeg|svg)/;

async function writeText(filePath, source) {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, source, "utf8");
}

async function writePost(scenario, relativePath, source) {
	await writeText(path.join(scenario.postDir, relativePath), source);
}

async function writeSpec(scenario, relativePath, source) {
	await writeText(path.join(scenario.specDir, relativePath), source);
}

async function readBuiltFile(artifact, ...segments) {
	return readFile(path.join(artifact.outDir, ...segments), "utf8");
}

async function pathExists(targetPath) {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function prepareExternalRich(scenario) {
	await writeText(
		scenario.siteConfigPath,
		`siteConfig:
  title: External Rich Demo
  subtitle: Artifact matrix
  site: https://rich.example.test
  toc:
    enable: true
    depth: 2
  banner:
    enable: true
    src: assets/images/banner.png
  favicon:
    - src: assets/images/favicon.svg
      theme: light
  permalink:
    postsPattern: /%slug%
    pagesPattern: /%slug%
    trailingSlash: auto
    postPatternRules: []
    aliasValidation: error
    updatedDateMode: manual
    updatedDateFallback: none

profileConfig:
  name: External Rich Demo
  bio: Artifact matrix
  avatar: assets/images/avatar.png
  links: []

qingyanConfig:
  siteKey: artifact-matrix
  apiBase: /api

commentConfig:
  enable: true

pageFeedbackConfig:
  enable: true
  like:
    enable: true
  reward:
    enable: true
    options:
      - id: coffee
        name: Coffee
        image: assets/reward/coffee.svg
        alt: Coffee

navBarI18n:
  nav.docs: 文档
  nav.repo: 代码仓库

navBarConfig:
  links:
    - name: nav.archive
      url: /archive/
    - name: nav.docs
      ref:
        collection: spec
        id: docs
    - id: nav.repo
      name: nav.repo
      url: https://example.com/repo
      external: true

footerConfig:
  policeRecord: 公网安备 00000000000000号
`,
	);

	await Promise.all([
		writeText(path.join(scenario.siteRoot, "assets", "images", "banner.png"), tinyPng),
		writeText(path.join(scenario.siteRoot, "assets", "images", "avatar.png"), tinyPng),
		writeText(path.join(scenario.siteRoot, "assets", "images", "body.png"), tinyPng),
		writeText(path.join(scenario.siteRoot, "assets", "images", "unused.png"), tinyPng),
		writeText(
			path.join(scenario.siteRoot, "assets", "images", "favicon.svg"),
			tinyBlueSvg,
		),
		writeText(
			path.join(scenario.siteRoot, "assets", "friends", "example-logo.svg"),
			tinyBlueSvg,
		),
		writeText(
			path.join(scenario.siteRoot, "assets", "reward", "coffee.svg"),
			tinyOrangeSvg,
		),
	]);

	await writeSpec(
		scenario,
		"about.md",
		`---
title: About Matrix
published: 2026-07-28
toc:
  enable: true
  depth: 3
comment: true
---

# About Matrix

## Section

### Deep Section
`,
	);
	await writeSpec(
		scenario,
		"docs.md",
		`---
title: Artifact Docs
published: 2026-07-28
alias: artifact-docs
---

# Artifact Docs
`,
	);
	await writeSpec(
		scenario,
		"guestbook.md",
		`---
title: Matrix Guestbook
published: 2026-07-28
---

# Guestbook body
`,
	);

	const richPostDir = path.join(scenario.postDir, "rich");
	await Promise.all([
		writeText(path.join(richPostDir, "cover.svg"), tinyBlueSvg),
		writeText(path.join(richPostDir, "inline.svg"), tinyOrangeSvg),
		writeText(path.join(richPostDir, "relative-link-logo.svg"), tinyBlueSvg),
	]);
	await writePost(
		scenario,
		"rich/index.md",
		`---
title: Rich Article
published: 2026-07-28
updated: 2026-07-28
description: Rich build artifact.
image: ./cover.svg
tags: [Demo]
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

::bilibili{bvid="BV1xx411c7mD" p="2" title="演示视频"}

::bilibili{bvid="bad"}

::link-card{url="https://example.com" title="Example Site" description="Remote card."}

::link-card{url="https://asset.example.com" title="Asset Logo" description="Site asset." logo="assets/friends/example-logo.svg"}

::link-card{url="https://relative.example.com" title="Relative Logo" description="Relative asset." logo="./relative-link-logo.svg"}

::link-card{url="javascript:alert(1)" title="Bad Site" description="Rejected."}

:::link-grid
::link-card{url="https://example-a.com" title="Example A" description="First site."}

::link-card{url="https://example-b.com" title="Example B" description="Second site."}
:::

![Relative image](./inline.svg)

![Site body image](assets/images/body.png)
`,
	);
	await writePost(
		scenario,
		"comments-disabled.md",
		`---
title: Comments Disabled
published: 2026-07-27
description: Per-entry comment override.
tags: [Demo]
category: Demo
draft: false
comment: false
---

Comments are disabled only for this entry.
`,
	);
	await writePost(
		scenario,
		"pinned.md",
		`---
title: Pinned Matrix Post
published: 2026-07-26
description: Pinned indicator probe.
tags: [Demo]
category: Demo
draft: false
sticky: 1
---

Pinned content.
`,
	);
}

async function prepareExternalDisabled(scenario) {
	await writeText(
		scenario.siteConfigPath,
		`siteConfig:
  title: External Disabled Demo
  subtitle: Artifact matrix
  site: https://disabled.example.test
  base: /prod/
  toc:
    enable: false
    depth: 2
  banner:
    enable: false
  favicon:
    - src: assets/images/favicon.svg
      theme: light

commentConfig:
  enable: true

pageFeedbackConfig:
  enable: true
  like:
    enable: true
  reward:
    enable: false
`,
	);
	await writeText(
		path.join(scenario.siteRoot, "assets", "images", "favicon.svg"),
		tinyBlueSvg,
	);
	await writeSpec(scenario, "about.md", "# About\n");
	await writePost(
		scenario,
		"disabled.md",
		`---
title: Disabled Gates
published: 2026-07-28
description: Global and environment gates.
tags: [Demo]
category: Demo
draft: false
comment: true
toc:
  enable: true
---

# Disabled Gates

## Section
`,
	);
}

async function preparePermalinkHtml(scenario) {
	await writeText(
		scenario.siteConfigPath,
		`siteConfig:
  title: HTML Permalink Demo
  subtitle: Artifact matrix
  permalink:
    postsPattern: /articles/%slug%.html
    pagesPattern: /%slug%.html
    trailingSlash: always
    postPatternRules: []
    aliasValidation: error
    updatedDateMode: manual
    updatedDateFallback: none

navBarI18n:
  nav.docs: 文档

navBarConfig:
  links:
    - name: nav.archive
      url: /archive/
    - name: nav.docs
      ref:
        collection: spec
        id: docs
`,
	);
	await writeSpec(scenario, "about.md", "# About\n");
	await writeSpec(
		scenario,
		"docs.md",
		`---
title: Docs
published: 2026-07-28
alias: renamed-docs
---

Docs body.
`,
	);
	await writePost(
		scenario,
		"hello.md",
		`---
title: HTML Article
published: 2026-07-28
alias: html-article
description: HTML permalink materialization.
tags: [Demo]
category: Demo
draft: false
---

HTML article body.
`,
	);
}

async function preparePermalinkMixed(scenario) {
	await writeText(
		scenario.siteConfigPath,
		`siteConfig:
  title: Mixed Permalink Demo
  subtitle: Artifact matrix
  site: https://mixed.example.test
  postsPerPage: 1
  lang: zh_CN
  permalink:
    postsPattern: /%slug%.html
    pagesPattern: /%slug%
    trailingSlash: auto
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
	);
	await writeSpec(scenario, "about.md", "# About\n");
	for (const [slug, title, day] of [
		["first", "First Article", "28"],
		["second", "Second Article", "27"],
		["third", "Third Article", "26"],
		["fourth", "Fourth Article", "25"],
		["fifth", "Fifth Article", "24"],
		["sixth", "Sixth Article", "23"],
	]) {
		await writePost(
			scenario,
			`${slug}.md`,
			`---
title: ${title}
published: 2026-07-${day}
description: Mixed permalink materialization.
tags: [Demo]
category: Demo
draft: false
---

${title} body.
`,
		);
	}
}

test(
	"site build artifact matrix",
	{ timeout: 45 * 60 * 1000 },
	async (t) => {
		const run = await createBuildRun(t);

		await t.test("external-rich artifact covers rendered feature contracts", async () => {
			const scenario = await run.createScenario("external-rich");
			await prepareExternalRich(scenario);
			const artifact = run.buildScenario(scenario);

			const homeHtml = await readBuiltFile(artifact, "index.html");
			const richHtml = await readBuiltFile(artifact, "rich", "index.html");
			const disabledHtml = await readBuiltFile(
				artifact,
				"comments-disabled",
				"index.html",
			);
			const aboutHtml = await readBuiltFile(artifact, "about", "index.html");
			const guestbookHtml = await readBuiltFile(
				artifact,
				"guestbook",
				"index.html",
			);
			const staticFiles = await readdir(path.join(artifact.outDir, "static"));

			await access(path.join(artifact.outDir, "pagefind", "pagefind.js"));
			assert.match(homeHtml, /External Rich Demo/);
			assert.match(homeHtml, /href="\/artifact-docs\/"/);
			assert.match(homeHtml, /aria-label="文档"/);
			assert.match(homeHtml, /aria-label="代码仓库"/);
			assert.match(homeHtml, /公网安备 00000000000000号/);
			assert.match(homeHtml, optimizedAssetPattern);
			assert.equal(
				staticFiles.some((file) => file.includes("unused")),
				false,
				"unreferenced external assets must not be emitted",
			);

			assert.match(
				richHtml,
				/<mark(?=[^>]*md-highlight)(?=[^>]*tone-warning)[^>]*>Important<\/mark>/,
			);
			assert.match(richHtml, /<aside(?=[^>]*md-aside)[^>]*>/);
			assert.match(
				richHtml,
				/<div(?=[^>]*md-fold)(?=[^>]*data-icon="bookmark")(?=[^>]*data-open="true")[^>]*>/,
			);
			assert.match(
				richHtml,
				/player\.bilibili\.com\/player\.html\?bvid=BV1xx411c7mD(?:&amp;|&#x26;)p=2/,
			);
			assert.match(richHtml, /data-md-directive-error="Invalid bilibili bvid"/);
			assert.match(richHtml, /data-md-directive-error="Invalid link-card url"/);
			assert.doesNotMatch(richHtml, /href="javascript:alert\(1\)"/);
			assert.match(richHtml, optimizedAssetPattern);
			assert.doesNotMatch(
				richHtml,
				/assets\/friends\/example-logo\.svg|\.\/relative-link-logo\.svg|assets\/images\/body\.png/,
			);
			assert.match(richHtml, /PostFeedback/);
			assert.match(richHtml, /CommentSection/);
			assert.match(richHtml, /artifact-matrix/);
			assert.doesNotMatch(disabledHtml, /CommentSection/);
			assert.match(disabledHtml, /PostFeedback/);

			assert.match(aboutHtml, /<table-of-contents/i);
			assert.match(aboutHtml, /#deep-section/i);
			assert.match(aboutHtml, /CommentSection/);
			assert.match(guestbookHtml, /Matrix Guestbook/);
			assert.match(homeHtml, /(置顶|TOP)[\s\S]*Pinned Matrix Post/);
		});

		await t.test("external-disabled artifact covers hard gates", async () => {
			const scenario = await run.createScenario("external-disabled");
			await prepareExternalDisabled(scenario);
			const artifact = run.buildScenario(scenario, {
				env: {
					FANGYUAN_DEV_BASE: "/dev-only/",
					PUBLIC_FANGYUAN_DEMO_QINGYAN: "true",
					PUBLIC_FANGYUAN_QINGYAN_SITE_KEY: "dev-only-demo",
				},
			});
			const articleHtml = await readBuiltFile(
				artifact,
				"disabled",
				"index.html",
			);

			assert.match(articleHtml, /id="toc"/);
			assert.doesNotMatch(articleHtml, /<table-of-contents/i);
			assert.doesNotMatch(articleHtml, /PostFeedback|CommentSection/);
			assert.doesNotMatch(articleHtml, /dev-only-demo|&quot;qingyan&quot;:/);
			assert.match(articleHtml, /href="\/prod\/static\//);
			assert.doesNotMatch(articleHtml, /\/dev-only\/static\//);
		});

		await t.test("permalink-html artifact covers html directory output", async () => {
			const scenario = await run.createScenario("permalink-html");
			await preparePermalinkHtml(scenario);
			const artifact = run.buildScenario(scenario);
			const homeHtml = await readBuiltFile(artifact, "index.html");
			const articleHtml = await readBuiltFile(
				artifact,
				"articles",
				"html-article.html",
				"index.html",
			);

			assert.match(homeHtml, /href="\/articles\/html-article\.html\/"/);
			assert.match(homeHtml, /href="\/archive\.html\/"/);
			assert.match(homeHtml, /href="\/renamed-docs\.html\/"/);
			assert.match(homeHtml, /aria-label="文档"/);
			assert.match(articleHtml, /HTML article body/);
		});

		await t.test("permalink-mixed artifact covers file and page routes", async () => {
			const scenario = await run.createScenario("permalink-mixed");
			await preparePermalinkMixed(scenario);
			const artifact = run.buildScenario(scenario);
			const homeHtml = await readBuiltFile(artifact, "index.html");
			const sitemapXml = await readBuiltFile(artifact, "sitemap-0.xml");

			await access(path.join(artifact.outDir, "first.html"));
			await access(path.join(artifact.outDir, "about", "index.html"));
			await access(path.join(artifact.outDir, "page", "2", "index.html"));
			assert.match(homeHtml, /href="\/first\.html"/);
			assert.match(homeHtml, /href="\/archive\/"/);
			assert.match(homeHtml, /href="\/page\/2\/"/);
			assert.match(homeHtml, /aria-label="主页"/);
			assert.match(sitemapXml, /https:\/\/mixed\.example\.test\/first\.html/);
			assert.match(sitemapXml, /https:\/\/mixed\.example\.test\/about\//);
		});

		await t.test("internal-default artifact keeps internal demo assets", async () => {
			const scenario = await run.createScenario("internal-default", {
				siteMode: "internal",
			});
			const artifact = run.buildScenario(scenario);
			const guideHtml = await readBuiltFile(
				artifact,
				"guide",
				"index.html",
			);
			const staticFiles = await readdir(path.join(artifact.outDir, "static"));

			await access(path.join(artifact.outDir, "pagefind", "pagefind.js"));
			assert.match(guideHtml, /id="post-cover"/);
			assert.ok(
				staticFiles.some((file) => file.startsWith("cover.")),
				"internal demo cover must be emitted",
			);
		});

		await t.test("missing-about fails with the content contract", async () => {
			const scenario = await run.createScenario("missing-about");
			await writeText(
				scenario.siteConfigPath,
				`siteConfig:
  title: Missing About
  banner:
    enable: false
`,
			);
			await writePost(
				scenario,
				"probe.md",
				`---
title: Probe
published: 2026-07-28
description: Missing about failure.
tags: [Demo]
category: Demo
draft: false
---

Probe.
`,
			);
			const artifact = run.buildScenario(scenario, { expectFailure: true });

			assert.match(artifact.output, /About page content not found/);
		});

		await t.test("missing-site-asset fails with the asset contract", async () => {
			const scenario = await run.createScenario("missing-site-asset");
			await writeText(
				scenario.siteConfigPath,
				`siteConfig:
  title: Missing Site Asset
  banner:
    enable: true
    src: assets/images/missing-banner.png
`,
			);
			await writeSpec(scenario, "about.md", "# About\n");
			await writePost(
				scenario,
				"probe.md",
				`---
title: Probe
published: 2026-07-28
description: Missing asset failure.
tags: [Demo]
category: Demo
draft: false
---

Probe.
`,
			);
			const artifact = run.buildScenario(scenario, { expectFailure: true });

			assert.match(artifact.output, /External site asset not found/);
			assert.match(
				artifact.output.replaceAll("\\", "/"),
				/assets\/images\/missing-banner\.png/,
			);
		});

		await t.test("invalid-relative-cover fails with the image contract", async () => {
			const scenario = await run.createScenario("invalid-relative-cover");
			await writeText(
				scenario.siteConfigPath,
				`siteConfig:
  title: Invalid Relative Cover
  banner:
    enable: false
`,
			);
			await writeSpec(scenario, "about.md", "# About\n");
			await writePost(
				scenario,
				"invalid/index.md",
				`---
title: Invalid Relative Cover
published: 2026-07-28
description: Invalid cover failure.
image: ../assets/missing-cover.svg
tags: [Demo]
category: Demo
draft: false
---

Invalid cover.
`,
			);
			const artifact = run.buildScenario(scenario, { expectFailure: true });

			assert.match(artifact.output, /ImageNotFound/);
			assert.match(artifact.output, /\.\.\/assets\/missing-cover\.svg/);
		});

		assert.equal(run.buildCount, 8, "the matrix must execute exactly eight builds");
		assert.equal(
			await pathExists(path.join(run.runRoot, "external-rich", "dist")),
			true,
			"successful artifacts stay available until the matrix finishes",
		);
	},
);
