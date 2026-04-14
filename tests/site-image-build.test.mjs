import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");
const siteRoot = path.join(repoRoot, "site");
const distRoot = path.join(repoRoot, "dist");
const siteConfigPath = path.join(siteRoot, "config.ts");
const siteAboutPath = path.join(siteRoot, "content", "spec", "about.md");
const publicIconDir = path.join(repoRoot, "public", "icon");

const tinyBlueSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><rect width="4" height="4" fill="#0ea5e9"/></svg>';
const tinyOrangeSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><rect width="4" height="4" fill="#f97316"/></svg>';

function run(command, args, expectedStatus = 0) {
	const result =
		process.platform === "win32"
			? spawnSync("cmd.exe", ["/c", command, ...args], {
					cwd: repoRoot,
					encoding: "utf8",
					env: { ...process.env, CI: "1" },
			  })
			: spawnSync(command, args, {
					cwd: repoRoot,
					encoding: "utf8",
					env: { ...process.env, CI: "1" },
			  });

	assert.equal(result.status, expectedStatus, result.stdout + result.stderr);
	return result;
}

async function withMutableSiteFixture(t, callback) {
	const originalConfig = existsSync(siteConfigPath)
		? await readFile(siteConfigPath, "utf8")
		: null;
	const originalAbout = existsSync(siteAboutPath)
		? await readFile(siteAboutPath, "utf8")
		: null;
	const createdPaths = [];

	t.after(async () => {
		for (const targetPath of createdPaths.reverse()) {
			await rm(targetPath, { recursive: true, force: true });
		}

		if (originalConfig === null) {
			await rm(siteConfigPath, { force: true });
		} else {
			await writeFile(siteConfigPath, originalConfig, "utf8");
		}

		if (originalAbout === null) {
			await rm(siteAboutPath, { force: true });
		} else {
			await writeFile(siteAboutPath, originalAbout, "utf8");
		}

		await rm(distRoot, { recursive: true, force: true });
	});

	await mkdir(path.dirname(siteConfigPath), { recursive: true });
	await mkdir(path.dirname(siteAboutPath), { recursive: true });

	await callback({
		markCreated(targetPath) {
			createdPaths.push(targetPath);
			return targetPath;
		},
	});
}

test(
	"cover image aliases should resolve site-root assets while markdown images stay on real relative paths",
	{ concurrency: false },
	async (t) => {
	await withMutableSiteFixture(t, async ({ markCreated }) => {
		const postDir = markCreated(
			path.join(siteRoot, "content", "posts", "__site-image-demo"),
		);
		const bannerPath = markCreated(
			path.join(siteRoot, "assets", "__site-image-test-banner.svg"),
		);
		const coverPath = markCreated(
			path.join(siteRoot, "assets", "__site-image-test-cover.svg"),
		);
		const avatarPath = markCreated(
			path.join(publicIconDir, "__site-image-test-avatar.svg"),
		);

		await mkdir(postDir, { recursive: true });
		await mkdir(path.dirname(bannerPath), { recursive: true });
		await mkdir(path.dirname(avatarPath), { recursive: true });

		await writeFile(
			path.join(postDir, "index.md"),
			`---
title: Site Image Demo
published: 2026-04-14
description: External content image probe.
image: "assets/__site-image-test-cover.svg"
tags: [Demo]
category: Demo
draft: false
---

![Inline image](./inline.svg)
`,
			"utf8",
		);
		await writeFile(path.join(postDir, "inline.svg"), tinyBlueSvg, "utf8");
		await writeFile(bannerPath, tinyBlueSvg, "utf8");
		await writeFile(coverPath, tinyBlueSvg, "utf8");
		await writeFile(avatarPath, tinyBlueSvg, "utf8");
		await writeFile(siteAboutPath, "# About\n", "utf8");
		await writeFile(
			siteConfigPath,
			`export const siteConfig = {
  title: "Site Image Demo",
  subtitle: "Probe",
  banner: {
    enable: true,
    src: "assets/__site-image-test-banner.svg",
    position: "center",
    credit: { enable: false, text: "", url: "" },
  },
};

export const profileConfig = {
  name: "Site Image Demo",
  bio: "Probe",
  avatar: "public/icon/__site-image-test-avatar.svg",
  links: [],
};
`,
			"utf8",
		);

		run("pnpm", ["build"]);

		const articleHtml = await readFile(
			path.join(distRoot, "posts", "__site-image-demo", "index.html"),
			"utf8",
		);
		const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");

		assert.match(articleHtml, /_astro\/.*\.(png|webp|jpg|jpeg|svg)/);
		assert.match(homeHtml, /_astro\/.*\.(png|webp|jpg|jpeg|svg)/);
		assert.match(homeHtml, /\/icon\/__site-image-test-avatar\.svg/);
		assert.doesNotMatch(articleHtml, /src\/generated|site-content/);
	});
	},
);

test(
	"invalid relative cover image paths should fail instead of being remapped",
	{ concurrency: false },
	async (t) => {
	await withMutableSiteFixture(t, async ({ markCreated }) => {
		const postDir = markCreated(
			path.join(siteRoot, "content", "posts", "__invalid-relative-cover"),
		);

		await mkdir(postDir, { recursive: true });
		await writeFile(
			path.join(postDir, "index.md"),
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
		await writeFile(path.join(postDir, "inline.svg"), tinyOrangeSvg, "utf8");
		await writeFile(siteAboutPath, "# About\n", "utf8");

		const result = run("pnpm", ["build"], 1);

		assert.match(result.stdout + result.stderr, /ImageNotFound/);
		assert.match(result.stdout + result.stderr, /\.\.\/assets\/__missing-cover\.svg/);
	});
	},
);

test(
	"remote site-level images should pass through unchanged while local article covers stay optimized",
	{ concurrency: false },
	async (t) => {
	await withMutableSiteFixture(t, async ({ markCreated }) => {
		const postDir = markCreated(
			path.join(siteRoot, "content", "posts", "__remote-avatar-demo"),
		);
		const coverPath = markCreated(
			path.join(siteRoot, "assets", "__site-image-test-remote-cover.svg"),
		);

		await mkdir(postDir, { recursive: true });
		await mkdir(path.dirname(coverPath), { recursive: true });
		await writeFile(
			path.join(postDir, "index.md"),
			`---
title: Remote Avatar Demo
published: 2026-04-14
description: Remote avatar passthrough.
image: "assets/__site-image-test-remote-cover.svg"
tags: [Demo]
category: Demo
draft: false
---

![Inline image](./inline.svg)
`,
			"utf8",
		);
		await writeFile(path.join(postDir, "inline.svg"), tinyOrangeSvg, "utf8");
		await writeFile(coverPath, tinyOrangeSvg, "utf8");
		await writeFile(siteAboutPath, "# About\n", "utf8");
		await writeFile(
			siteConfigPath,
			`export const profileConfig = {
  name: "Remote Avatar Demo",
  bio: "Probe",
  avatar: "https://cdn.example.com/avatar.png",
  links: [],
};
`,
			"utf8",
		);

		run("pnpm", ["build"]);

		const homeHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
		const articleHtml = await readFile(
			path.join(distRoot, "posts", "__remote-avatar-demo", "index.html"),
			"utf8",
		);

		assert.match(homeHtml, /https:\/\/cdn\.example\.com\/avatar\.png/);
		assert.match(articleHtml, /_astro\/.*\.(png|webp|jpg|jpeg|svg)/);
	});
	},
);
