import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";

import {
	applySiteConfigUpdate,
	planSiteConfigUpdate,
} from "../scripts/site/update-site-config.js";
import {
	currentSiteConfigVersion,
	migrateSiteConfigObject,
} from "../scripts/site/update-site-config-migrations.js";
import { loadExternalSiteConfigYaml } from "../src/utils/site-source/external-config.ts";

test("migrateSiteConfigObject treats missing version as version 0", () => {
	const result = migrateSiteConfigObject({
		siteConfig: {
			title: "Demo",
		},
	});

	assert.equal(result.changed, true);
	assert.equal(result.fromVersion, 0);
	assert.equal(result.toVersion, currentSiteConfigVersion);
	assert.equal(result.config.fangyuanConfigVersion, currentSiteConfigVersion);
	assert.deepEqual(result.config.siteConfig.title, "Demo");
	assert.equal(
		result.actions.some(
			(action) =>
				action.file === "site.config.yaml" &&
				action.path === "fangyuanConfigVersion",
		),
		true,
	);
});

test("migrateSiteConfigObject migrates legacy rewardOptions when unambiguous", () => {
	const result = migrateSiteConfigObject({
		pageFeedbackConfig: {
			rewardOptions: [
				{
					id: "coffee",
					name: "Coffee",
					image: "assets/reward/coffee.png",
				},
			],
		},
	});

	assert.equal(result.changed, true);
	assert.deepEqual(result.config.pageFeedbackConfig.reward.options, [
		{
			id: "coffee",
			name: "Coffee",
			image: "assets/reward/coffee.png",
		},
	]);
	assert.equal("rewardOptions" in result.config.pageFeedbackConfig, false);
	assert.equal(
		result.actions.some(
			(action) =>
				action.path ===
				"pageFeedbackConfig.rewardOptions -> pageFeedbackConfig.reward.options",
		),
		true,
	);
});

test("migrateSiteConfigObject moves matching legacy QingYan configs to shared qingyanConfig", () => {
	const result = migrateSiteConfigObject({
		commentConfig: {
			enable: true,
			qingyan: {
				siteKey: "virace-notes",
				apiBase: "/api",
			},
		},
		pageMetricsConfig: {
			enable: true,
			qingyan: {
				siteKey: "virace-notes",
				apiBase: "/api",
			},
		},
		pageFeedbackConfig: {
			enable: true,
			qingyan: {
				siteKey: "virace-notes",
				apiBase: "/api",
			},
		},
	});

	assert.equal(result.changed, true);
	assert.deepEqual(result.config.qingyanConfig, {
		siteKey: "virace-notes",
		apiBase: "/api",
	});
	assert.equal("qingyan" in result.config.commentConfig, false);
	assert.equal("qingyan" in result.config.pageMetricsConfig, false);
	assert.equal("qingyan" in result.config.pageFeedbackConfig, false);
	assert.equal(result.config.fangyuanConfigVersion, currentSiteConfigVersion);
	assert.equal(
		result.actions.some(
			(action) =>
				action.path ===
				"commentConfig.qingyan/pageMetricsConfig.qingyan/pageFeedbackConfig.qingyan -> qingyanConfig",
		),
		true,
	);
});

test("migrateSiteConfigObject keeps current version idempotent", () => {
	const input = {
		fangyuanConfigVersion: currentSiteConfigVersion,
		siteConfig: {
			title: "Current",
		},
	};

	const result = migrateSiteConfigObject(input);

	assert.equal(result.changed, false);
	assert.equal(result.fromVersion, currentSiteConfigVersion);
	assert.equal(result.toVersion, currentSiteConfigVersion);
	assert.deepEqual(result.config, input);
	assert.deepEqual(result.actions, []);
	assert.deepEqual(result.manualActions, []);
});

test("migrateSiteConfigObject blocks future versions instead of downgrading", () => {
	const input = {
		fangyuanConfigVersion: currentSiteConfigVersion + 1,
		siteConfig: {
			title: "Future",
		},
	};

	const result = migrateSiteConfigObject(input);

	assert.equal(result.changed, false);
	assert.deepEqual(result.config, input);
	assert.equal(result.manualActions.length, 1);
	assert.match(result.manualActions[0].reason, /newer/i);
});

test("migrateSiteConfigObject preserves unknown user fields", () => {
	const result = migrateSiteConfigObject({
		customBlock: {
			keep: true,
		},
		siteConfig: {
			title: "Custom",
		},
	});

	assert.deepEqual(result.config.customBlock, {
		keep: true,
	});
});

test("migrateSiteConfigObject adds taxonomySort defaults", () => {
	const result = migrateSiteConfigObject({
		siteConfig: {
			title: "Demo",
		},
	});

	assert.equal(result.changed, true);
	assert.deepEqual(result.config.siteConfig.taxonomySort, {
		categories: {
			key: "name",
			order: "asc",
			uncategorizedPosition: "sorted",
		},
		tags: {
			key: "name",
			order: "asc",
		},
	});
	assert.equal(
		result.actions.some((action) => action.path === "siteConfig.taxonomySort"),
		true,
	);
});

test("migrateSiteConfigObject fills partial taxonomySort defaults", () => {
	const result = migrateSiteConfigObject({
		siteConfig: {
			taxonomySort: {
				categories: {
					key: "count",
				},
			},
		},
	});

	assert.equal(result.changed, true);
	assert.deepEqual(result.config.siteConfig.taxonomySort, {
		categories: {
			key: "count",
			order: "asc",
			uncategorizedPosition: "sorted",
		},
		tags: {
			key: "name",
			order: "asc",
		},
	});
});

test("migrateSiteConfigObject blocks conflicting reward shapes", () => {
	const input = {
		pageFeedbackConfig: {
			rewardOptions: [
				{
					id: "old",
					name: "Old",
					image: "assets/reward/old.png",
				},
			],
			reward: {
				options: [
					{
						id: "new",
						name: "New",
						image: "assets/reward/new.png",
					},
				],
			},
		},
	};

	const result = migrateSiteConfigObject(input);

	assert.equal(result.changed, false);
	assert.deepEqual(result.config, input);
	assert.equal(result.manualActions.length, 1);
	assert.equal(result.manualActions[0].path, "pageFeedbackConfig.rewardOptions");
});

test("migrateSiteConfigObject blocks conflicting legacy QingYan configs", () => {
	const input = {
		commentConfig: {
			qingyan: {
				siteKey: "comments",
				apiBase: "/api",
			},
		},
		pageMetricsConfig: {
			qingyan: {
				siteKey: "metrics",
				apiBase: "/api",
			},
		},
	};

	const result = migrateSiteConfigObject(input);

	assert.equal(result.changed, false);
	assert.deepEqual(result.config, input);
	assert.equal(result.manualActions.length, 1);
	assert.equal(result.manualActions[0].path, "qingyanConfig");
	assert.match(result.manualActions[0].reason, /QingYan/i);
});

test("planSiteConfigUpdate reports missing config file", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	const plan = await planSiteConfigUpdate(siteRoot);

	assert.equal(plan.actions[0].status, "missing");
	assert.equal(plan.writeNeeded, false);
});

test("planSiteConfigUpdate plans YAML migration without writing", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	const configPath = path.join(siteRoot, "site.config.yaml");
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`siteConfig:
  title: Demo
customBlock:
  keep: true
`,
		"utf8",
	);

	const plan = await planSiteConfigUpdate(siteRoot);
	const original = await readFile(configPath, "utf8");

	assert.equal(plan.writeNeeded, true);
	assert.equal(plan.currentVersion, 0);
	assert.equal(plan.targetVersion, currentSiteConfigVersion);
	assert.equal(original.includes("fangyuanConfigVersion"), false);
	assert.equal(parse(plan.content).fangyuanConfigVersion, currentSiteConfigVersion);
	assert.deepEqual(parse(plan.content).customBlock, {
		keep: true,
	});
});

test("applySiteConfigUpdate creates backup before writing migrated config", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	const configPath = path.join(siteRoot, "site.config.yaml");
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`siteConfig:
  title: Demo
`,
		"utf8",
	);

	const original = await readFile(configPath, "utf8");
	const plan = await planSiteConfigUpdate(siteRoot);
	const result = await applySiteConfigUpdate(plan, {
		now: new Date("2026-05-03T04:05:06"),
	});

	assert.equal(result.status, "written");
	assert.equal(result.actions.length, plan.actions.length);
	assert.equal(
		result.actions.every((action) => action.status === "written"),
		true,
	);
	assert.equal(
		result.backupPath,
		path.join(
			siteRoot,
			".backup",
			"20260503-040506",
			"site.config.yaml",
		),
	);
	assert.equal(await readFile(result.backupPath, "utf8"), original);
	assert.equal(result.actions[0].backupPath, result.backupPath);
	assert.equal(
		parse(await readFile(configPath, "utf8")).fangyuanConfigVersion,
		currentSiteConfigVersion,
	);
	assert.doesNotThrow(() => loadExternalSiteConfigYaml(configPath));
});

test("applySiteConfigUpdate refuses writes when manual actions exist", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	const configPath = path.join(siteRoot, "site.config.yaml");
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`pageFeedbackConfig:
  rewardOptions:
    - id: old
      name: Old
      image: assets/reward/old.png
  reward:
    options:
      - id: new
        name: New
        image: assets/reward/new.png
`,
		"utf8",
	);

	const plan = await planSiteConfigUpdate(siteRoot);
	const result = await applySiteConfigUpdate(plan);

	assert.equal(result.status, "blocked");
	assert.equal(existsSync(path.join(siteRoot, ".backup")), false);
	assert.equal(
		(await readFile(configPath, "utf8")).includes("rewardOptions"),
		true,
	);
});
