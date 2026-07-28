import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadExternalSiteConfigYaml } from "../src/utils/site-source/external-config.ts";
import {
	buildWelcomePostTemplate,
	renderSiteConfigTemplate,
} from "../scripts/site/init-site.js";

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
	assert.match(rendered, /qingyanConfig:[\s\S]*siteKey: "?virace-notes"?/);
	assert.match(rendered, /qingyanDevProxyTarget: "?http:\/\/localhost:4401"?/);
	assert.match(rendered, /永久链接规则/);
	assert.match(rendered, /替换位置：assets\/images\/banner\.svg/);
	assert.match(rendered, /reward:[\s\S]*enable: false/);
	assert.doesNotMatch(rendered, /\{\{SITE_TITLE\}\}/);
});

test("buildWelcomePostTemplate keeps scaffold source and user-facing replacement hint", () => {
	const source = buildWelcomePostTemplate({
		siteTitle: "Virace Notes",
	});

	assert.match(source, /^---[\s\S]*title: Welcome to Virace Notes/m);
	assert.match(source, /This post is created by `node scripts\/site\/init-site.js`/);
	assert.match(source, /fresh external site root buildable/);
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
	assert.equal(loaded?.siteConfig?.banner?.src, "assets/images/banner.svg");
	assert.equal(loaded?.profileConfig?.avatar, "assets/images/avatar.svg");
	assert.equal(loaded?.qingyanConfig?.siteKey, "virace-notes");
	assert.equal(loaded?.pageFeedbackConfig?.reward?.enable, false);
	assert.equal(loaded?.qingyanDevProxyTarget, null);
});
