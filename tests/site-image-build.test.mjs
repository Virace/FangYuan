import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runBuild, withMutableSiteFixture } from "./test-helpers/site-fixture.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");
const publicIconDir = path.join(repoRoot, "public", "icon");

const tinyBlueSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><rect width="4" height="4" fill="#0ea5e9"/></svg>';
const tinyOrangeSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><rect width="4" height="4" fill="#f97316"/></svg>';

test(
	"relative article covers stay optimized while public config avatars pass through unchanged",
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
				const articleDir = markCreated(path.join(postDir, "__site-image-demo"));
				const avatarPath = path.join(
					publicIconDir,
					"__site-image-test-avatar.svg",
				);

				t.after(async () => {
					await rm(avatarPath, { force: true });
				});

				await mkdir(articleDir, { recursive: true });
				await mkdir(path.dirname(avatarPath), { recursive: true });

				await writeFile(
					path.join(articleDir, "index.md"),
					`---
title: Site Image Demo
published: 2026-04-14
description: External content image probe.
image: "./cover.svg"
tags: [Demo]
category: Demo
draft: false
---

![Inline image](./inline.svg)
`,
					"utf8",
				);
				await writeFile(path.join(articleDir, "inline.svg"), tinyBlueSvg, "utf8");
				await writeFile(path.join(articleDir, "cover.svg"), tinyBlueSvg, "utf8");
				await writeFile(avatarPath, tinyBlueSvg, "utf8");
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Site Image Demo
  subtitle: Probe
  banner:
    enable: false

profileConfig:
  name: Site Image Demo
  bio: Probe
  avatar: public/icon/__site-image-test-avatar.svg
  links: []
`,
					"utf8",
				);

				runBuild();

				const articleHtml = await readFile(
					path.join(distRoot, "__site-image-demo", "index.html"),
					"utf8",
				);
				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");

				assert.match(articleHtml, /_astro\/.*\.(png|webp|jpg|jpeg|svg)/);
				assert.match(homeHtml, /_astro\/.*\.(png|webp|jpg|jpeg|svg)/);
				assert.match(homeHtml, /\/icon\/__site-image-test-avatar\.svg/);
				assert.doesNotMatch(articleHtml, /src\/generated|site-content/);
			},
		);
	},
);

test(
	"invalid relative cover image paths should fail instead of being remapped",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ postDir, siteAboutPath, siteConfigPath, markCreated }) => {
				const articleDir = markCreated(
					path.join(postDir, "__invalid-relative-cover"),
				);

				await mkdir(articleDir, { recursive: true });
				await writeFile(
					path.join(articleDir, "index.md"),
					`---
title: Invalid Relative Cover
published: 2026-04-14
description: This should fail.
image: "../assets/__missing-cover.svg"
tags: [Demo]
category: Demo
draft: false
---

![Inline image](./inline.svg)
`,
					"utf8",
				);
				await writeFile(
					path.join(articleDir, "inline.svg"),
					tinyOrangeSvg,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Invalid Relative Cover
  subtitle: Probe
`,
					"utf8",
				);

				const result = runBuild(1);

				assert.match(result.stdout + result.stderr, /ImageNotFound/);
				assert.match(
					result.stdout + result.stderr,
					/\.\.\/assets\/__missing-cover\.svg/,
				);
			},
		);
	},
);

test(
	"remote site-level images should pass through unchanged while local article covers stay optimized",
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
				const articleDir = markCreated(
					path.join(postDir, "__remote-avatar-demo"),
				);
				await mkdir(articleDir, { recursive: true });
				await writeFile(
					path.join(articleDir, "index.md"),
					`---
title: Remote Avatar Demo
published: 2026-04-14
description: Remote avatar passthrough.
image: "./cover.svg"
tags: [Demo]
category: Demo
draft: false
---

![Inline image](./inline.svg)
`,
					"utf8",
				);
				await writeFile(path.join(articleDir, "inline.svg"), tinyOrangeSvg, "utf8");
				await writeFile(path.join(articleDir, "cover.svg"), tinyOrangeSvg, "utf8");
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writeFile(
					siteConfigPath,
					`profileConfig:
  name: Remote Avatar Demo
  bio: Probe
  avatar: https://cdn.example.com/avatar.png
  links: []
`,
					"utf8",
				);

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
				const articleHtml = await readFile(
					path.join(distRoot, "__remote-avatar-demo", "index.html"),
					"utf8",
				);

				assert.match(homeHtml, /https:\/\/cdn\.example\.com\/avatar\.png/);
				assert.match(articleHtml, /_astro\/.*\.(png|webp|jpg|jpeg|svg)/);
			},
		);
	},
);
