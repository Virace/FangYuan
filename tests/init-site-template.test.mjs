import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadExternalSiteConfigYaml } from "../src/utils/external-site-config.ts";
import {
	buildWelcomePostTemplate,
	renderSiteConfigTemplate,
} from "../scripts/site/init-site.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");
const templatePath = path.join(repoRoot, "scripts", "site", "template.config.yaml");

test("template.config.yaml contains the full commented config surface", async () => {
	const source = await readFile(templatePath, "utf8");
	assert.match(source, /siteConfig:/);
	assert.match(source, /navBarConfig:/);
	assert.match(source, /profileConfig:/);
	assert.match(source, /footerConfig:/);
	assert.match(source, /licenseConfig:/);
	assert.match(source, /expressiveCodeConfig:/);
	assert.match(source, /commentConfig:/);
	assert.match(source, /pageMetricsConfig:/);
	assert.match(source, /pageFeedbackConfig:/);
	assert.match(source, /qingyanDevProxyTarget:/);
	assert.match(source, /site:\s+null/);
	assert.match(source, /base:\s+\//);
	assert.match(source, /\{\{SITE_TITLE\}\}/);
	assert.match(source, /永久链接规则/);
});

test("renderSiteConfigTemplate replaces placeholders without dropping comments", async () => {
	const rendered = await renderSiteConfigTemplate({
		siteTitle: "Virace Notes",
		siteSubtitle: "QingYan ready",
		profileName: "Virace",
		profileBio: "Personal notes",
		qingyanSiteKey: "virace-notes",
		qingyanDevProxyTarget: "http://localhost:4401",
	});

	assert.match(rendered, /title: "?Virace Notes"?/);
	assert.match(rendered, /profileConfig:[\s\S]*name: "?Virace"?/);
	assert.match(rendered, /qingyanDevProxyTarget: "?http:\/\/localhost:4401"?/);
	assert.match(rendered, /永久链接规则/);
	assert.doesNotMatch(rendered, /\{\{SITE_TITLE\}\}/);
});

test("buildWelcomePostTemplate keeps scaffold source and user-facing replacement hint", () => {
	const source = buildWelcomePostTemplate({
		siteTitle: "Virace Notes",
	});

	assert.match(source, /^---[\s\S]*title: Welcome to Virace Notes/m);
	assert.match(source, /This post is created by `node scripts\/site\/init-site.js`/);
});

test("rendered template is accepted by the strict YAML schema", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-template-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	const rendered = await renderSiteConfigTemplate({
		siteTitle: "Virace Notes",
		siteSubtitle: "QingYan ready",
		profileName: "Virace",
		profileBio: "Personal notes",
		qingyanSiteKey: "virace-notes",
		qingyanDevProxyTarget: null,
	});

	await writeFile(configPath, rendered, "utf8");
	const loaded = loadExternalSiteConfigYaml(configPath);

	assert.equal(loaded?.siteConfig?.title, "Virace Notes");
	assert.equal(loaded?.profileConfig?.name, "Virace");
	assert.equal(loaded?.qingyanDevProxyTarget, null);
});
