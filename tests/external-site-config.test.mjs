import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadExternalSiteConfigYaml } from "../src/utils/external-site-config.ts";

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
commentConfig:
  enable: true
  qingyan:
    siteKey: virace-notes
    apiBase: /api
qingyanDevProxyTarget: http://localhost:4401
`,
		"utf8",
	);

	const loaded = loadExternalSiteConfigYaml(configPath);
	assert.equal(loaded?.siteConfig?.title, "Virace Notes");
	assert.equal(loaded?.siteConfig?.toc?.depth, 2);
	assert.equal(loaded?.profileConfig?.name, "Virace");
	assert.equal(loaded?.expressiveCodeConfig?.theme, "github-light");
	assert.equal(loaded?.commentConfig?.qingyan?.siteKey, "virace-notes");
	assert.equal(loaded?.qingyanDevProxyTarget, "http://localhost:4401");
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
