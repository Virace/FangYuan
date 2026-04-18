# Init-Site QingYan Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `scripts/init-site.js` from a minimal empty-site scaffold into a QingYan-aware interactive initializer that can generate a usable `site/config.ts` and keep the external-site workflow buildable.

**Architecture:** Keep the current scaffold contract centered on `ensureExternalSiteScaffold()`, but split template generation and prompt normalization into small pure helpers so the CLI wrapper stays thin. The generated `site/config.ts` must remain simple enough for `src/utils/site-source.ts` and `src/config.ts` to consume without introducing dynamic parsing or runtime-only conventions.

**Tech Stack:** Node ESM scripts, built-in `node:readline/promises`, built-in `node:test`, existing external-site config/runtime helpers under `src/`.

---

## Scope

- In scope:
  - Preserve the current empty-site scaffold and idempotent behavior
  - Generate QingYan-aware `site/config.ts` from explicit scaffold options
  - Add interactive CLI prompts for fresh-site initialization
  - Document QingYan local dev / deployment / config handoff
- Out of scope:
  - Installing or deploying QingYan automatically
  - Editing an existing non-empty `site/config.ts` in place
  - Introducing a new prompt dependency just for nicer CLI cosmetics

## File Map

- Modify: `scripts/init-site.js`
  - Keep the public scaffold entrypoint and direct-execution CLI
- Create: `scripts/init-site-template.js`
  - Generate `site/config.ts` and the seeded welcome post from explicit options
- Create: `scripts/init-site-prompts.js`
  - Collect and normalize interactive answers with built-in Node APIs
- Modify: `tests/init-site-script.test.mjs`
  - Lock the new scaffold shape and preserve idempotency
- Create: `tests/init-site-template.test.mjs`
  - Cover template rendering without touching the filesystem
- Create: `tests/init-site-prompts.test.mjs`
  - Cover prompt-answer normalization and QingYan defaults
- Create: `docs/qingyan-init-site.md`
  - User-facing QingYan setup and `init-site` usage guide

### Task 1: Extract QingYan-Aware Template Builders

**Files:**
- Create: `scripts/init-site-template.js`
- Modify: `tests/init-site-script.test.mjs`
- Create: `tests/init-site-template.test.mjs`

- [ ] **Step 1: Write the failing template tests**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
	buildSiteConfigTemplate,
	buildWelcomePostTemplate,
} from "../scripts/init-site-template.js";

test("buildSiteConfigTemplate renders QingYan-aware config with literal values", () => {
	const source = buildSiteConfigTemplate({
		siteTitle: "Virace Notes",
		siteSubtitle: "QingYan ready",
		profileName: "Virace",
		profileBio: "Personal notes",
		qingyanSiteKey: "virace-notes",
		qingyanApiBase: "/api",
		qingyanDevProxyTarget: "http://localhost:4401",
		enableComments: true,
		enablePageMetrics: true,
		enablePageFeedback: true,
		includeRewardPlaceholders: true,
	});

	assert.match(source, /export const qingyanDevProxyTarget = "http:\/\/localhost:4401";/);
	assert.match(source, /siteKey:\s*"virace-notes"/);
	assert.match(source, /apiBase:\s*"\/api"/);
	assert.match(source, /export const commentConfig: CommentConfig = \{/);
	assert.match(source, /export const pageMetricsConfig: PageMetricsConfig = \{/);
	assert.match(source, /export const pageFeedbackConfig: PageFeedbackConfig = \{/);
	assert.match(source, /rewardOptions:/);
});

test("buildWelcomePostTemplate keeps scaffold source and user-facing replacement hint", () => {
	const source = buildWelcomePostTemplate({
		siteTitle: "Virace Notes",
	});

	assert.match(source, /^---[\s\S]*title: Welcome to Virace Notes/m);
	assert.match(source, /This post is created by `node scripts\/init-site.js`/);
});
```

- [ ] **Step 2: Run the template tests to verify they fail**

Run:

```powershell
node --test tests/init-site-template.test.mjs
```

Expected:

```text
FAIL because scripts/init-site-template.js does not exist yet
```

- [ ] **Step 3: Implement the pure template helpers**

```js
// scripts/init-site-template.js
function renderQingYanConfigBlock({ enabled, siteKey, apiBase }) {
	if (!enabled) {
		return "null";
	}

	return `{
		siteKey: ${JSON.stringify(siteKey)},
		apiBase: ${JSON.stringify(apiBase)},
	}`;
}

export function buildSiteConfigTemplate(options) {
	const rewardOptions = options.includeRewardPlaceholders
		? `	rewardOptions: [
		{
			id: "wechat",
			name: "微信",
			image: "/images/reward/wechat-placeholder.svg",
			alt: "微信打赏二维码",
		},
		{
			id: "alipay",
			name: "支付宝",
			image: "/images/reward/alipay-placeholder.svg",
			alt: "支付宝打赏二维码",
		},
	],`
		: `	rewardOptions: [],`;

	return `import type {
	CommentConfig,
	PageFeedbackConfig,
	PageMetricsConfig,
} from "../src/types/config";

export const siteConfig = {
	title: ${JSON.stringify(options.siteTitle)},
	subtitle: ${JSON.stringify(options.siteSubtitle)},
};

export const profileConfig = {
	name: ${JSON.stringify(options.profileName)},
	bio: ${JSON.stringify(options.profileBio)},
	links: [],
};

${options.qingyanDevProxyTarget ? `export const qingyanDevProxyTarget = ${JSON.stringify(options.qingyanDevProxyTarget)};` : `// export const qingyanDevProxyTarget = "http://localhost:4401";`}

export const commentConfig: CommentConfig = {
	enable: ${options.enableComments},
	qingyan: ${renderQingYanConfigBlock({
		enabled: options.enableComments,
		siteKey: options.qingyanSiteKey,
		apiBase: options.qingyanApiBase,
	})},
};

export const pageMetricsConfig: PageMetricsConfig = {
	enable: ${options.enablePageMetrics},
	qingyan: ${renderQingYanConfigBlock({
		enabled: options.enablePageMetrics,
		siteKey: options.qingyanSiteKey,
		apiBase: options.qingyanApiBase,
	})},
};

export const pageFeedbackConfig: PageFeedbackConfig = {
	enable: ${options.enablePageFeedback},
	qingyan: ${renderQingYanConfigBlock({
		enabled: options.enablePageFeedback,
		siteKey: options.qingyanSiteKey,
		apiBase: options.qingyanApiBase,
	})},
${rewardOptions}
};
`;
}
```

- [ ] **Step 4: Re-run the tests**

Run:

```powershell
node --test tests/init-site-template.test.mjs
```

Expected:

```text
2 tests pass
```

- [ ] **Step 5: Commit**

```powershell
git add scripts/init-site-template.js tests/init-site-template.test.mjs tests/init-site-script.test.mjs
git commit -m "feat(init-site): 提取清言配置模板生成"
```

### Task 2: Let the Scaffold Accept Explicit Init Options

**Files:**
- Modify: `scripts/init-site.js`
- Modify: `tests/init-site-script.test.mjs`

- [ ] **Step 1: Extend the scaffold tests to cover custom QingYan options**

```js
const result = ensureExternalSiteScaffold(tempRoot, {
	siteTitle: "Virace Notes",
	siteSubtitle: "QingYan ready",
	profileName: "Virace",
	profileBio: "Personal notes",
	qingyanSiteKey: "virace-notes",
	qingyanApiBase: "/api",
	qingyanDevProxyTarget: "http://localhost:4401",
	enableComments: true,
	enablePageMetrics: true,
	enablePageFeedback: true,
	includeRewardPlaceholders: true,
});

const siteConfigSource = await readFile(
	path.join(tempRoot, "site", "config.ts"),
	"utf8",
);

assert.match(siteConfigSource, /title: "Virace Notes"/);
assert.match(siteConfigSource, /bio: "Personal notes"/);
assert.match(siteConfigSource, /export const qingyanDevProxyTarget = "http:\/\/localhost:4401";/);
assert.match(siteConfigSource, /enable: true,\s+qingyan:/);
assert.match(siteConfigSource, /rewardOptions:/);
assert.equal(result.createdFiles.includes(path.join(tempRoot, "site", "config.ts")), true);
```

- [ ] **Step 2: Run the scaffold test file**

Run:

```powershell
node --test tests/init-site-script.test.mjs
```

Expected:

```text
FAIL because ensureExternalSiteScaffold currently always writes the fixed minimal template
```

- [ ] **Step 3: Thread explicit options through the scaffold**

```js
// scripts/init-site.js
import {
	buildSiteConfigTemplate,
	buildWelcomePostTemplate,
} from "./init-site-template.js";

export function ensureExternalSiteScaffold(rootDir = process.cwd(), input = {}) {
	const options = {
		siteTitle: input.siteTitle ?? "My Site",
		siteSubtitle: input.siteSubtitle ?? "My subtitle",
		profileName: input.profileName ?? "Your Name",
		profileBio: input.profileBio ?? "Write something here.",
		qingyanSiteKey: input.qingyanSiteKey ?? "fangyuan",
		qingyanApiBase: input.qingyanApiBase ?? "/api",
		qingyanDevProxyTarget: input.qingyanDevProxyTarget ?? null,
		enableComments: input.enableComments ?? true,
		enablePageMetrics: input.enablePageMetrics ?? true,
		enablePageFeedback: input.enablePageFeedback ?? true,
		includeRewardPlaceholders: input.includeRewardPlaceholders ?? true,
	};

	// keep the existing directory creation and idempotent file rules
	ensureFile(siteConfigPath, buildSiteConfigTemplate(options), createdFiles);

	if (shouldSeedDemoPost) {
		ensureFile(siteDemoPostPath, buildWelcomePostTemplate(options), createdFiles);
	}
}
```

- [ ] **Step 4: Re-run the scaffold tests**

Run:

```powershell
node --test tests/init-site-script.test.mjs tests/init-site-template.test.mjs
```

Expected:

```text
All listed tests pass
```

- [ ] **Step 5: Commit**

```powershell
git add scripts/init-site.js tests/init-site-script.test.mjs scripts/init-site-template.js tests/init-site-template.test.mjs
git commit -m "feat(init-site): 支持清言感知初始化选项"
```

### Task 3: Add Interactive Prompt Collection Without New Dependencies

**Files:**
- Create: `scripts/init-site-prompts.js`
- Modify: `scripts/init-site.js`
- Create: `tests/init-site-prompts.test.mjs`

- [ ] **Step 1: Write failing prompt-normalization tests**

```js
import assert from "node:assert/strict";
import test from "node:test";

import { normalizeInitSiteAnswers } from "../scripts/init-site-prompts.js";

test("normalizeInitSiteAnswers applies QingYan defaults and trims blanks", () => {
	const options = normalizeInitSiteAnswers({
		siteTitle: " Virace Notes ",
		siteSubtitle: " QingYan ready ",
		profileName: " Virace ",
		profileBio: "",
		qingyanSiteKey: " virace-notes ",
		qingyanDevProxyTarget: " http://localhost:4401 ",
		enableComments: "y",
		enablePageMetrics: "y",
		enablePageFeedback: "n",
		includeRewardPlaceholders: "n",
	});

	assert.deepEqual(options, {
		siteTitle: "Virace Notes",
		siteSubtitle: "QingYan ready",
		profileName: "Virace",
		profileBio: "",
		qingyanSiteKey: "virace-notes",
		qingyanApiBase: "/api",
		qingyanDevProxyTarget: "http://localhost:4401",
		enableComments: true,
		enablePageMetrics: true,
		enablePageFeedback: false,
		includeRewardPlaceholders: false,
	});
});
```

- [ ] **Step 2: Run the prompt tests to verify they fail**

Run:

```powershell
node --test tests/init-site-prompts.test.mjs
```

Expected:

```text
FAIL because scripts/init-site-prompts.js does not exist yet
```

- [ ] **Step 3: Implement prompt helpers and wire direct execution**

```js
// scripts/init-site-prompts.js
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

function parseYesNo(value, fallback) {
	const normalized = value.trim().toLowerCase();
	if (!normalized) return fallback;
	return normalized === "y" || normalized === "yes";
}

export function normalizeInitSiteAnswers(raw) {
	return {
		siteTitle: raw.siteTitle.trim() || "My Site",
		siteSubtitle: raw.siteSubtitle.trim() || "My subtitle",
		profileName: raw.profileName.trim() || "Your Name",
		profileBio: raw.profileBio.trim(),
		qingyanSiteKey: raw.qingyanSiteKey.trim() || "fangyuan",
		qingyanApiBase: "/api",
		qingyanDevProxyTarget: raw.qingyanDevProxyTarget.trim() || null,
		enableComments: parseYesNo(raw.enableComments, true),
		enablePageMetrics: parseYesNo(raw.enablePageMetrics, true),
		enablePageFeedback: parseYesNo(raw.enablePageFeedback, true),
		includeRewardPlaceholders: parseYesNo(raw.includeRewardPlaceholders, true),
	};
}

export async function promptInitSiteOptions() {
	if (!input.isTTY || !output.isTTY) {
		throw new Error("init-site interactive mode requires a TTY.");
	}

	const rl = readline.createInterface({ input, output });
	try {
		return normalizeInitSiteAnswers({
			siteTitle: await rl.question("Site title: "),
			siteSubtitle: await rl.question("Site subtitle: "),
			profileName: await rl.question("Profile name: "),
			profileBio: await rl.question("Profile bio (optional): "),
			qingyanSiteKey: await rl.question("QingYan site key [fangyuan]: "),
			qingyanDevProxyTarget: await rl.question("Local QingYan proxy target [http://localhost:4401 or blank]: "),
			enableComments: await rl.question("Enable comments? [Y/n]: "),
			enablePageMetrics: await rl.question("Enable page metrics? [Y/n]: "),
			enablePageFeedback: await rl.question("Enable page feedback? [Y/n]: "),
			includeRewardPlaceholders: await rl.question("Add reward placeholders? [Y/n]: "),
		});
	} finally {
		rl.close();
	}
}
```

```js
// scripts/init-site.js
import { promptInitSiteOptions } from "./init-site-prompts.js";

if (isExecutedDirectly()) {
	const options = await promptInitSiteOptions();
	const result = ensureExternalSiteScaffold(process.cwd(), options);
	console.log(`Created directories: ${result.createdDirectories.length}`);
	console.log(`Created files: ${result.createdFiles.length}`);
}
```

- [ ] **Step 4: Re-run prompt and scaffold tests**

Run:

```powershell
node --test tests/init-site-prompts.test.mjs tests/init-site-script.test.mjs tests/init-site-template.test.mjs
```

Expected:

```text
All listed tests pass
```

- [ ] **Step 5: Commit**

```powershell
git add scripts/init-site.js scripts/init-site-prompts.js tests/init-site-prompts.test.mjs tests/init-site-script.test.mjs tests/init-site-template.test.mjs
git commit -m "feat(init-site): 接入交互式初始化流程"
```

### Task 4: Document QingYan Setup and Init-Site Workflow

**Files:**
- Create: `docs/qingyan-init-site.md`

- [ ] **Step 1: Write the QingYan setup guide**

```md
# QingYan Init-Site Guide

## Local Development

1. Prepare the sibling `QingYan` repository next to `FangYuan`
2. Confirm `config/qingyan.yml` or `config/qingyan.example.yml`
3. Run `pnpm dev:full` in `FangYuan`

## site/config.ts

- `qingyanDevProxyTarget` is optional and must stay a string literal when enabled
- `commentConfig`, `pageMetricsConfig`, and `pageFeedbackConfig` may each point at the same `/api` base
- `siteKey` should match the QingYan-side site registration

## Production

- Deploy QingYan separately
- Keep FangYuan `apiBase` on the same-origin reverse-proxy surface when possible
- Use `init-site` only for fresh-site bootstrap; existing non-empty `site/` trees stay user-owned
```

- [ ] **Step 2: Verify the doc matches the real repo commands**

Run:

```powershell
rg -n "\"dev:full\"|init-site|loadExternalQingYanDevProxyTarget|QINGYAN_CONFIG_PATH" package.json scripts src
```

Expected:

```text
Matches package.json, scripts/dev-with-qingyan.mjs, scripts/init-site.js, and src/utils/site-source.ts
```

- [ ] **Step 3: Commit**

```powershell
git add docs/qingyan-init-site.md
git commit -m "docs(init-site): 补充清言初始化与部署说明"
```

### Task 5: Full Verification

**Files:**
- Verify: `scripts/init-site.js`
- Verify: `scripts/init-site-template.js`
- Verify: `scripts/init-site-prompts.js`
- Verify: `tests/init-site-script.test.mjs`
- Verify: `tests/init-site-template.test.mjs`
- Verify: `tests/init-site-prompts.test.mjs`
- Verify: `tests/external-site-content-config.test.mjs`

- [ ] **Step 1: Run the Node-side init-site and external-site tests**

Run:

```powershell
node --test tests/init-site-script.test.mjs tests/init-site-template.test.mjs tests/init-site-prompts.test.mjs tests/external-site-content-config.test.mjs
```

Expected:

```text
All listed tests PASS
```

- [ ] **Step 2: Run repo-level checks**

Run:

```powershell
pnpm check
pnpm build
```

Expected:

```text
Astro check exits with 0 errors
Astro build and Pagefind complete successfully
```

- [ ] **Step 3: Manual CLI smoke on a temp site root**

Run:

```powershell
node --input-type=module -e "import os from 'node:os'; import path from 'node:path'; import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'; import { ensureExternalSiteScaffold } from './scripts/init-site.js'; const root = mkdtempSync(path.join(os.tmpdir(), 'fangyuan-init-site-')); mkdirSync(path.join(root, 'src', 'content', 'spec'), { recursive: true }); writeFileSync(path.join(root, 'src', 'content', 'spec', 'about.md'), '# About\\n'); ensureExternalSiteScaffold(root, { siteTitle: 'Smoke Site', siteSubtitle: 'Ready', profileName: 'Smoke', profileBio: '', qingyanSiteKey: 'smoke-site', qingyanApiBase: '/api', qingyanDevProxyTarget: 'http://localhost:4401', enableComments: true, enablePageMetrics: true, enablePageFeedback: true, includeRewardPlaceholders: true }); console.log(readFileSync(path.join(root, 'site', 'config.ts'), 'utf8'));"
```

Expected:

```text
Printed config includes Smoke Site, smoke-site, /api, and qingyanDevProxyTarget
```

- [ ] **Step 4: Commit**

```powershell
git add scripts/init-site.js scripts/init-site-template.js scripts/init-site-prompts.js tests/init-site-script.test.mjs tests/init-site-template.test.mjs tests/init-site-prompts.test.mjs docs/qingyan-init-site.md
git commit -m "feat(init-site): 完成交互式清言站点初始化"
```

## Self-Review Checklist

- Spec coverage:
  - Interactive fresh-site bootstrap is covered by Tasks 1-3
  - QingYan deployment/config guidance is covered by Task 4
  - Verification and smoke checks are covered by Task 5
- Placeholder scan:
  - No unresolved TODO/TBD markers remain in the plan
- Type consistency:
  - `siteTitle`, `siteSubtitle`, `profileName`, `profileBio`, `qingyanSiteKey`, `qingyanApiBase`, `qingyanDevProxyTarget`, `enableComments`, `enablePageMetrics`, `enablePageFeedback`, and `includeRewardPlaceholders` are reused consistently across tasks
