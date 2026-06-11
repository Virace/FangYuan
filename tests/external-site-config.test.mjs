import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadExternalSiteConfigYaml } from "../src/utils/site-source/external-config.ts";

test("loadExternalSiteConfigYaml parses a valid site.config.yaml", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-yaml-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`
siteConfig:
  site: https://virace.dev
  base: /notes/
  title: Virace Notes
  subtitle: Demo
  toc:
    enable: true
    depth: 2
profileConfig:
  name: Virace
  bio: Personal notes
expressiveCodeConfig:
  theme: github-light
qingyanConfig:
  siteKey: virace-notes
  apiBase: /api
commentConfig:
  enable: true
qingyanDevProxyTarget: http://localhost:4401
`,
		"utf8",
	);

	const loaded = loadExternalSiteConfigYaml(configPath);
	assert.equal(loaded?.siteConfig?.site, "https://virace.dev");
	assert.equal(loaded?.siteConfig?.base, "/notes/");
	assert.equal(loaded?.siteConfig?.title, "Virace Notes");
	assert.equal(loaded?.siteConfig?.toc?.depth, 2);
	assert.equal(loaded?.profileConfig?.name, "Virace");
	assert.equal(loaded?.expressiveCodeConfig?.theme, "github-light");
	assert.equal(loaded?.qingyanConfig?.siteKey, "virace-notes");
	assert.equal(loaded?.qingyanDevProxyTarget, "http://localhost:4401");
});

test("loadExternalSiteConfigYaml accepts FangYuan config migration metadata", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-yaml-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`
fangyuanConfigVersion: 1
siteConfig:
  title: Versioned
`,
		"utf8",
	);

	const loaded = loadExternalSiteConfigYaml(configPath);
	assert.equal(loaded?.fangyuanConfigVersion, 1);
	assert.equal(loaded?.siteConfig?.title, "Versioned");
});

test("loadExternalSiteConfigYaml throws on invalid toc depth", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-yaml-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`
siteConfig:
  toc:
    enable: true
    depth: 4
`,
		"utf8",
	);

	assert.throws(() => loadExternalSiteConfigYaml(configPath), /toc/i);
});

test("loadExternalSiteConfigYaml accepts null qingyanDevProxyTarget", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-yaml-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`
siteConfig:
  title: Demo
qingyanDevProxyTarget: null
`,
		"utf8",
	);

	const loaded = loadExternalSiteConfigYaml(configPath);
	assert.equal(loaded?.qingyanDevProxyTarget, null);
});

test("loadExternalSiteConfigYaml accepts page feedback like and reward switches", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-config-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`
pageFeedbackConfig:
  enable: true
  like:
    enable: false
  reward:
    enable: true
    options:
      - id: coffee
        name: Coffee
        image: assets/reward/coffee.png
        alt: Coffee reward QR code
`,
		"utf8",
	);

	const loaded = loadExternalSiteConfigYaml(configPath);
	assert.equal(loaded?.pageFeedbackConfig?.like?.enable, false);
	assert.equal(loaded?.pageFeedbackConfig?.reward?.enable, true);
	assert.deepEqual(loaded?.pageFeedbackConfig?.reward?.options, [
		{
			id: "coffee",
			name: "Coffee",
			image: "assets/reward/coffee.png",
			alt: "Coffee reward QR code",
		},
	]);
});

test("loadExternalSiteConfigYaml accepts taxonomy sort config", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-yaml-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`
siteConfig:
  taxonomySort:
    categories:
      key: count
      order: desc
      uncategorizedPosition: last
    tags:
      key: count
      order: desc
`,
		"utf8",
	);

	const loaded = loadExternalSiteConfigYaml(configPath);
	assert.deepEqual(loaded?.siteConfig?.taxonomySort, {
		categories: {
			key: "count",
			order: "desc",
			uncategorizedPosition: "last",
		},
		tags: {
			key: "count",
			order: "desc",
		},
	});
});

test("loadExternalSiteConfigYaml rejects invalid taxonomy sort config", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-yaml-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`
siteConfig:
  taxonomySort:
    categories:
      key: updated
      uncategorizedPosition: top
`,
		"utf8",
	);

	assert.throws(() => loadExternalSiteConfigYaml(configPath), /taxonomySort/i);
});

test("loadExternalSiteConfigYaml rejects legacy nested QingYan configs", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-config-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`
commentConfig:
  enable: true
  qingyan:
    siteKey: legacy
    apiBase: /api
`,
		"utf8",
	);

	assert.throws(() => loadExternalSiteConfigYaml(configPath), /qingyan/i);
});

test("loadExternalSiteConfigYaml accepts the full rendered template", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-config-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	const templatePath = path.join(
		process.cwd(),
		"scripts",
		"site",
		"template.config.yaml",
	);
	const templateSource = await readFile(templatePath, "utf8");
	const rendered = templateSource
		.replaceAll("{{SITE_TITLE}}", JSON.stringify("Demo Site"))
		.replaceAll("{{SITE_SUBTITLE}}", JSON.stringify("Demo Subtitle"))
		.replaceAll("{{PROFILE_NAME}}", JSON.stringify("Virace"))
		.replaceAll("{{PROFILE_BIO}}", JSON.stringify("Personal notes"))
		.replaceAll("{{QINGYAN_SITE_KEY}}", JSON.stringify("virace-demo"))
		.replaceAll("{{QINGYAN_DEV_PROXY_TARGET}}", "null");

	await writeFile(configPath, rendered, "utf8");

	const loaded = loadExternalSiteConfigYaml(configPath);
	assert.equal(loaded?.siteConfig?.title, "Demo Site");
	assert.equal(loaded?.profileConfig?.name, "Virace");
	assert.equal(loaded?.qingyanDevProxyTarget, null);
});

test("loadExternalSiteConfigYaml rejects unknown top-level keys", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-config-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`siteConfig:
  title: Demo
unknownTopLevel: true
`,
		"utf8",
	);

	assert.throws(() => loadExternalSiteConfigYaml(configPath), /unknownTopLevel/);
});

test("loadExternalSiteConfigYaml rejects unknown nested keys", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-config-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`siteConfig:
  banner:
    enable: true
    src: assets/images/demo-banner.png
    foo: bar
`,
		"utf8",
	);

	assert.throws(() => loadExternalSiteConfigYaml(configPath), /banner/i);
});

test("loadExternalSiteConfigYaml rejects legacy page feedback rewardOptions", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-config-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`pageFeedbackConfig:
  rewardOptions:
    - id: coffee
      name: Coffee
      image: /images/reward/wechat-placeholder.svg
`,
		"utf8",
	);

	assert.throws(() => loadExternalSiteConfigYaml(configPath), /rewardOptions/);
});
