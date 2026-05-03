import assert from "node:assert/strict";
import { access, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runBuild, withMutableSiteFixture } from "./test-helpers/site-fixture.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

const tinyBlueSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><rect width="4" height="4" fill="#0ea5e9"/></svg>';
const tinyOrangeSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><rect width="4" height="4" fill="#f97316"/></svg>';
const tinyPng = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAG0lEQVR4nGP8z8AARLJgwiYGdggIjwUA2d0CBYzN2M8AAAAASUVORK5CYII=",
	"base64",
);
const optimizedAssetPattern = /\/static\/.*\.(?:png|webp|jpg|jpeg|svg)/;

async function pathExists(targetPath) {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
}

test(
	"build can write Astro and Pagefind output to a configured external directory",
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
				const articleDir = markCreated(path.join(postDir, "__custom-out-dir"));
				const customDistRoot = path.join(fixtureRoot, "dist");

				await rm(distRoot, { recursive: true, force: true });
				await mkdir(articleDir, { recursive: true });
				await writeFile(
					path.join(articleDir, "index.md"),
					`---
title: Custom Out Dir
published: 2026-04-14
description: Custom output directory probe.
tags: [Demo]
category: Demo
draft: false
---

Custom output directory probe.
`,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Custom Out Dir
  subtitle: Probe
  banner:
    enable: false
`,
					"utf8",
				);

				runBuild(0, { FANGYUAN_BUILD_OUT_DIR: customDistRoot });

				const homeHtml = await readFile(
					path.join(customDistRoot, "index.html"),
					"utf8",
				);
				await readFile(path.join(customDistRoot, "pagefind", "pagefind.js"));
				assert.match(homeHtml, /Custom Out Dir/);
				assert.equal(
					await pathExists(path.join(customDistRoot, "favicon")),
					false,
					"legacy public favicon files should not be copied to dist",
				);
				assert.equal(
					await pathExists(path.join(customDistRoot, "icon")),
					false,
					"legacy public icon files should not be copied to dist",
				);
				assert.equal(
					await pathExists(path.join(customDistRoot, "images")),
					false,
					"legacy public image placeholders should not be copied to dist",
				);
			},
		);
	},
);

test(
	"site-level local aliases resolve assets under a custom external site root",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ distRoot, fixtureRoot, postDir, siteAboutPath, siteConfigPath, markCreated }) => {
				const articleDir = markCreated(path.join(postDir, "__external-assets"));
				const imageDir = path.join(fixtureRoot, "assets", "images");

				await mkdir(articleDir, { recursive: true });
				await mkdir(imageDir, { recursive: true });
				await writeFile(
					path.join(articleDir, "index.md"),
					`---
title: External Assets
published: 2026-04-14
description: External root assets probe.
tags: [Demo]
category: Demo
draft: false
---

External root assets probe.
`,
					"utf8",
				);
				await writeFile(path.join(imageDir, "banner.png"), tinyPng);
				await writeFile(path.join(imageDir, "avatar.png"), tinyPng);
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: External Assets
  subtitle: Probe
  banner:
    enable: true
    src: assets/images/banner.png

profileConfig:
  name: External Assets
  bio: Probe
  avatar: assets/images/avatar.png
  links: []
`,
					"utf8",
				);

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");

				assert.match(homeHtml, optimizedAssetPattern);
				assert.doesNotMatch(
					homeHtml,
					/Local image alias not found|assets\/images\/banner\.png/,
				);
			},
		);
	},
);

test(
	"site-level local aliases fail when a custom external site root is missing the asset",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ postDir, siteAboutPath, siteConfigPath, markCreated }) => {
				const articleDir = markCreated(path.join(postDir, "__missing-external-asset"));

				await mkdir(articleDir, { recursive: true });
				await writeFile(
					path.join(articleDir, "index.md"),
					`---
title: Missing External Asset
published: 2026-04-14
description: Missing external asset probe.
tags: [Demo]
category: Demo
draft: false
---

Missing external asset probe.
`,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Missing External Asset
  subtitle: Probe
  banner:
    enable: true
    src: assets/images/demo-banner.png

profileConfig:
  name: Missing External Asset
  bio: Probe
  avatar: assets/images/demo-avatar.png
  links: []
`,
					"utf8",
				);

				const result = runBuild(1);
				const output = result.stdout + result.stderr;

				assert.match(output, /External site asset not found/);
				assert.match(output.replaceAll("\\", "/"), /assets\/images\/demo-banner\.png/);
			},
		);
	},
);

test(
	"relative article covers stay optimized while external config avatars are bundled from the site root",
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
					fixtureRoot,
					"assets",
					"images",
					"avatar.svg",
				);

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
  avatar: assets/images/avatar.svg
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

				assert.match(articleHtml, optimizedAssetPattern);
				assert.match(homeHtml, optimizedAssetPattern);
				assert.doesNotMatch(homeHtml, /assets\/images\/avatar\.svg/);
				assert.doesNotMatch(articleHtml, /src\/generated|site-content/);
			},
		);
	},
);

test(
	"external site assets only emit referenced files from a custom external site root",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ distRoot, fixtureRoot, postDir, siteAboutPath, siteConfigPath, markCreated }) => {
				const articleDir = markCreated(path.join(postDir, "__referenced-assets"));
				const imageDir = path.join(fixtureRoot, "assets", "images");

				await mkdir(articleDir, { recursive: true });
				await mkdir(imageDir, { recursive: true });
				await writeFile(
					path.join(articleDir, "index.md"),
					`---
title: Referenced Assets
published: 2026-04-14
description: Referenced assets probe.
tags: [Demo]
category: Demo
draft: false
---

Referenced assets probe.
`,
					"utf8",
				);
				await writeFile(path.join(imageDir, "banner.png"), tinyPng);
				await writeFile(path.join(imageDir, "unused.png"), tinyPng);
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Referenced Assets
  subtitle: Probe
  banner:
    enable: true
    src: assets/images/banner.png

profileConfig:
  name: Referenced Assets
  bio: Probe
  avatar: https://cdn.example.com/avatar.png
  links: []
`,
					"utf8",
				);

				runBuild();

				const staticFiles = await readdir(path.join(distRoot, "static"));
				assert.equal(
					staticFiles.some((file) => file.includes("unused")),
					false,
					"unreferenced external site assets should not be emitted",
				);
			},
		);
	},
);

test(
	"police record uses the theme-owned emblem without requiring an external site asset",
	{ concurrency: false },
	async (t) => {
		await withMutableSiteFixture(
			t,
			async ({ distRoot, postDir, siteAboutPath, siteConfigPath, markCreated }) => {
				const articleDir = markCreated(path.join(postDir, "__police-record"));

				await mkdir(articleDir, { recursive: true });
				await writeFile(
					path.join(articleDir, "index.md"),
					`---
title: Police Record
published: 2026-04-14
description: Police record probe.
tags: [Demo]
category: Demo
draft: false
---

Police record probe.
`,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writeFile(
					siteConfigPath,
					`siteConfig:
  title: Police Record
  subtitle: Probe
  banner:
    enable: false

footerConfig:
  policeRecord: "公网安备 00000000000000号"
`,
					"utf8",
				);

				runBuild();

				const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");

				assert.match(homeHtml, /公网安备 00000000000000号/);
				assert.match(homeHtml, optimizedAssetPattern);
				assert.doesNotMatch(homeHtml, /assets\/icons\/police-emblem/);
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
				assert.match(articleHtml, optimizedAssetPattern);
			},
		);
	},
);
