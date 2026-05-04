import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
	runBuild,
	withMutableSiteFixture,
} from "./test-helpers/site-fixture.mjs";

async function writePost(postDir, markCreated, relativePath, source) {
	const absolutePath = markCreated(path.join(postDir, relativePath));
	await mkdir(path.dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, source, "utf8");
}

async function writeSpec(specDir, markCreated, relativePath, source) {
	const absolutePath = markCreated(path.join(specDir, relativePath));
	await mkdir(path.dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, source, "utf8");
}

async function readBuiltPage(distRoot, ...segments) {
	return readFile(path.join(distRoot, ...segments, "index.html"), "utf8");
}

test("build keeps PostFeedback mounted by default for reward-only pages without qingyan backend", {
	concurrency: false,
}, async (t) => {
	await withMutableSiteFixture(
		t,
		async ({
			siteConfigPath,
			postDir,
			siteAboutPath,
			distRoot,
			markCreated,
		}) => {
			await mkdir(path.join(path.dirname(siteConfigPath), "assets", "reward"), {
				recursive: true,
			});
			await writeFile(
				path.join(
					path.dirname(siteConfigPath),
					"assets",
					"reward",
					"wechat.svg",
				),
				'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4"/></svg>',
				"utf8",
			);
			await writeFile(
				siteConfigPath,
				`pageFeedbackConfig:
  reward:
    options:
      - id: coffee
        name: Coffee
        image: assets/reward/wechat.svg
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
});

test("build omits PostFeedback when like and reward are both disabled", {
	concurrency: false,
}, async (t) => {
	await withMutableSiteFixture(
		t,
		async ({
			siteConfigPath,
			postDir,
			siteAboutPath,
			distRoot,
			markCreated,
		}) => {
			await mkdir(path.join(path.dirname(siteConfigPath), "assets", "reward"), {
				recursive: true,
			});
			await writeFile(
				path.join(
					path.dirname(siteConfigPath),
					"assets",
					"reward",
					"wechat.svg",
				),
				'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4"/></svg>',
				"utf8",
			);
			await writeFile(
				siteConfigPath,
				`qingyanConfig:
  siteKey: fangyuan-test
  apiBase: /api
pageFeedbackConfig:
  enable: true
  like:
    enable: false
  reward:
    enable: false
    options:
      - id: coffee
        name: Coffee
        image: assets/reward/wechat.svg
        alt: Coffee
`,
				"utf8",
			);
			await writeFile(siteAboutPath, "# About\n", "utf8");
			await writePost(
				postDir,
				markCreated,
				"__disabled-feedback-demo/index.md",
				`---
title: Disabled Feedback Demo
published: 2026-04-22
description: disabled feedback should not mount
tags: [Demo]
category: Demo
draft: false
---
Disabled feedback demo.
`,
			);

			runBuild();

			const articleHtml = await readFile(
				path.join(distRoot, "__disabled-feedback-demo", "index.html"),
				"utf8",
			);

			assert.doesNotMatch(articleHtml, /PostFeedback/);
			assert.doesNotMatch(articleHtml, /Coffee/);
			assert.doesNotMatch(articleHtml, /支持这篇文章/);
		},
	);
});

test("build exposes external QingYan config to client-only feedback and comment islands", {
	concurrency: false,
}, async (t) => {
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
				`qingyanConfig:
  siteKey: fangyuan-client-test
  apiBase: /api
commentConfig:
  enable: true
pageFeedbackConfig:
  enable: true
  like:
    enable: true
  reward:
    enable: false
`,
				"utf8",
			);
			await writeFile(siteAboutPath, "# About\n", "utf8");
			await writePost(
				postDir,
				markCreated,
				"__qingyan-client-demo/index.md",
				`---
title: QingYan Client Demo
published: 2026-05-04
description: qingyan config should reach browser islands
tags: [Demo]
category: Demo
draft: false
---
QingYan client demo.
`,
			);

			runBuild();

			const articleHtml = await readFile(
				path.join(distRoot, "__qingyan-client-demo", "index.html"),
				"utf8",
			);

			assert.match(
				articleHtml,
				/opts="\{&quot;name&quot;:&quot;PostFeedback&quot;,&quot;value&quot;:&quot;svelte&quot;\}"/,
			);
			assert.match(
				articleHtml,
				/opts="\{&quot;name&quot;:&quot;CommentSection&quot;,&quot;value&quot;:&quot;svelte&quot;\}"/,
			);
			assert.match(articleHtml, /fangyuan-client-test/);
			assert.match(articleHtml, /&quot;qingyan&quot;:/);
			assert.match(articleHtml, /&quot;apiBase&quot;:\[0,&quot;\/api&quot;\]/);
		},
	);
});

test("build applies entry comment frontmatter defaults and overrides", {
	concurrency: false,
}, async (t) => {
	await withMutableSiteFixture(
		t,
		async ({
			siteConfigPath,
			postDir,
			specDir,
			siteAboutPath,
			distRoot,
			markCreated,
		}) => {
			await writeFile(
				siteConfigPath,
				`qingyanConfig:
  siteKey: fangyuan-comment-frontmatter-test
  apiBase: /api
commentConfig:
  enable: true
pageFeedbackConfig:
  enable: false
`,
				"utf8",
			);
			await writeFile(siteAboutPath, "# About\n", "utf8");
			await writePost(
				postDir,
				markCreated,
				"__comment-default-post/index.md",
				`---
title: Comment Default Post
published: 2026-05-04
description: post defaults to comments enabled
tags: [Demo]
category: Demo
draft: false
---
Post defaults to comments enabled.
`,
			);
			await writePost(
				postDir,
				markCreated,
				"__comment-disabled-post/index.md",
				`---
title: Comment Disabled Post
published: 2026-05-04
description: post can disable comments
tags: [Demo]
category: Demo
draft: false
comment: false
---
Post disables comments.
`,
			);
			await writeSpec(
				specDir,
				markCreated,
				"__comment-default-spec.md",
				"# Spec defaults to comments disabled\n",
			);
			await writeSpec(
				specDir,
				markCreated,
				"__comment-enabled-spec.md",
				`---
comment: true
---
# Spec enables comments
`,
			);

			runBuild();

			const defaultPostHtml = await readBuiltPage(
				distRoot,
				"__comment-default-post",
			);
			const disabledPostHtml = await readBuiltPage(
				distRoot,
				"__comment-disabled-post",
			);
			const defaultSpecHtml = await readBuiltPage(
				distRoot,
				"__comment-default-spec",
			);
			const enabledSpecHtml = await readBuiltPage(
				distRoot,
				"__comment-enabled-spec",
			);

			assert.match(defaultPostHtml, /CommentSection/);
			assert.doesNotMatch(disabledPostHtml, /CommentSection/);
			assert.doesNotMatch(defaultSpecHtml, /CommentSection/);
			assert.match(enabledSpecHtml, /CommentSection/);
			assert.match(enabledSpecHtml, /spec:__comment-enabled-spec/);
		},
	);
});

test("build treats global comments and QingYan config as hard gates", {
	concurrency: false,
}, async (t) => {
	await withMutableSiteFixture(
		t,
		async ({
			siteConfigPath,
			postDir,
			specDir,
			siteAboutPath,
			distRoot,
			markCreated,
		}) => {
			await writeFile(
				siteConfigPath,
				`qingyanConfig:
  siteKey: fangyuan-comment-gate-test
  apiBase: /api
commentConfig:
  enable: false
pageFeedbackConfig:
  enable: false
`,
				"utf8",
			);
			await writeFile(siteAboutPath, "# About\n", "utf8");
			await writePost(
				postDir,
				markCreated,
				"__comment-global-disabled-post/index.md",
				`---
title: Comment Global Disabled Post
published: 2026-05-04
description: global comments disabled
tags: [Demo]
category: Demo
draft: false
---
Global comments disable this post.
`,
			);
			await writeSpec(
				specDir,
				markCreated,
				"__comment-global-disabled-spec.md",
				`---
comment: true
---
# Global comments disable this spec
`,
			);

			runBuild();

			assert.doesNotMatch(
				await readBuiltPage(distRoot, "__comment-global-disabled-post"),
				/CommentSection/,
			);
			assert.doesNotMatch(
				await readBuiltPage(distRoot, "__comment-global-disabled-spec"),
				/CommentSection/,
			);

			await writeFile(
				siteConfigPath,
				`commentConfig:
  enable: true
pageFeedbackConfig:
  enable: false
`,
				"utf8",
			);

			runBuild();

			assert.doesNotMatch(
				await readBuiltPage(distRoot, "__comment-global-disabled-post"),
				/CommentSection/,
			);
			assert.doesNotMatch(
				await readBuiltPage(distRoot, "__comment-global-disabled-spec"),
				/CommentSection/,
			);
		},
	);
});

test("build ignores dev-only QingYan demo env for ordinary external sites", {
	concurrency: false,
}, async (t) => {
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
				`commentConfig:
  enable: true
pageFeedbackConfig:
  enable: true
  like:
    enable: true
  reward:
    enable: false
`,
				"utf8",
			);
			await writeFile(siteAboutPath, "# About\n", "utf8");
			await writePost(
				postDir,
				markCreated,
				"__ordinary-external-demo/index.md",
				`---
title: Ordinary External Demo
published: 2026-05-04
description: ordinary build should not inherit demo qingyan env
tags: [Demo]
category: Demo
draft: false
---
Ordinary external demo.
`,
			);

			runBuild(0, {
				PUBLIC_FANGYUAN_DEMO_QINGYAN: "true",
				PUBLIC_FANGYUAN_QINGYAN_SITE_KEY: "dev-only-demo",
			});

			const articleHtml = await readFile(
				path.join(distRoot, "__ordinary-external-demo", "index.html"),
				"utf8",
			);

			assert.doesNotMatch(articleHtml, /PostFeedback/);
			assert.doesNotMatch(articleHtml, /CommentSection/);
			assert.doesNotMatch(articleHtml, /dev-only-demo/);
			assert.doesNotMatch(articleHtml, /&quot;qingyan&quot;:/);
		},
	);
});

test("build ignores dev-only base override for ordinary external sites", {
	concurrency: false,
}, async (t) => {
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
  site: https://example.com
  base: /prod/
`,
				"utf8",
			);
			await writeFile(siteAboutPath, "# About\n", "utf8");
			await writePost(
				postDir,
				markCreated,
				"__dev-base-demo/index.md",
				`---
title: Dev Base Demo
published: 2026-05-04
description: build should keep configured base
tags: [Demo]
category: Demo
draft: false
---
Dev base demo.
`,
			);

			runBuild(0, {
				FANGYUAN_DEV_BASE: "/dev-only/",
			});

			const articleHtml = await readFile(
				path.join(distRoot, "__dev-base-demo", "index.html"),
				"utf8",
			);

			assert.match(articleHtml, /href="\/prod\/static\//);
			assert.doesNotMatch(articleHtml, /\/dev-only\/static\//);
		},
	);
});
