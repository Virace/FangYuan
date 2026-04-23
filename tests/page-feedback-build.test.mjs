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
	"build keeps PostFeedback mounted by default for reward-only pages without qingyan backend",
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
					`pageFeedbackConfig:
  rewardOptions:
    - id: coffee
      name: Coffee
      image: /images/reward/wechat-placeholder.svg
      alt: Coffee
`,
					"utf8",
				);
				await writeFile(siteAboutPath, "# About\n", "utf8");
				await writePost(
					postDir,
					markCreated,
					"__reward-feedback-demo/index.md",
					`---
title: Reward Feedback Demo
published: 2026-04-22
description: reward only feedback should still mount
tags: [Demo]
category: Demo
draft: false
---
Reward only feedback demo.
`,
				);

				runBuild();

				const articleHtml = await readFile(
					path.join(distRoot, "__reward-feedback-demo", "index.html"),
					"utf8",
				);

				assert.match(
					articleHtml,
					/opts="\{&quot;name&quot;:&quot;PostFeedback&quot;,&quot;value&quot;:&quot;svelte&quot;\}"/,
				);
				assert.match(articleHtml, /Coffee/);
				assert.doesNotMatch(articleHtml, /CommentSection/);
			},
		);
	},
);
