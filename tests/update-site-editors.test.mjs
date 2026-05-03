import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	applyEditorUpdates,
	mergeRecommendations,
	mergeVSCodeSettings,
	planEditorUpdates,
} from "../scripts/site/update-site-editors.js";

test("planEditorUpdates plans missing external editor files", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	const plan = await planEditorUpdates(siteRoot);
	const byFile = new Map(plan.actions.map((action) => [action.file, action]));

	assert.equal(plan.manualActions.length, 0);
	assert.equal(byFile.get("frontmatter.json")?.action, "overwrite");
	assert.equal(byFile.get("frontmatter.json")?.status, "planned");
	assert.equal(byFile.get(".vscode/extensions.json")?.action, "merge");
	assert.equal(byFile.get(".vscode/settings.json")?.action, "merge");

	const frontmatterConfig = JSON.parse(byFile.get("frontmatter.json").content);
	assert.deepEqual(frontmatterConfig["frontMatter.content.pageFolders"], [
		{
			title: "posts",
			path: "[[workspace]]/content/posts",
			contentTypes: ["default"],
		},
		{
			title: "spec",
			path: "[[workspace]]/content/spec",
			contentTypes: ["spec"],
		},
	]);
	assert.equal(frontmatterConfig["frontMatter.content.publicFolder"], "assets");
});

test("mergeRecommendations preserves existing entries and skips case-insensitive duplicates", () => {
	assert.deepEqual(
		mergeRecommendations(
			["custom.publisher", "Eliostruyf.VSCode-Front-Matter"],
			[
				"eliostruyf.vscode-front-matter",
				"astro-build.astro-vscode",
				"custom.publisher",
			],
		),
		[
			"custom.publisher",
			"Eliostruyf.VSCode-Front-Matter",
			"astro-build.astro-vscode",
		],
	);
});

test("planEditorUpdates preserves external extension recommendations", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(siteRoot, ".vscode"), { recursive: true });
	await writeFile(
		path.join(siteRoot, ".vscode", "extensions.json"),
		`${JSON.stringify(
			{
				recommendations: [
					"custom.publisher",
					"Eliostruyf.VSCode-Front-Matter",
				],
			},
			null,
			2,
		)}\n`,
		"utf8",
	);

	const plan = await planEditorUpdates(siteRoot);
	const extensions = plan.actions.find(
		(action) => action.file === ".vscode/extensions.json",
	);
	const content = JSON.parse(extensions.content);

	assert.equal(extensions.status, "planned");
	assert.deepEqual(content.recommendations.slice(0, 2), [
		"custom.publisher",
		"Eliostruyf.VSCode-Front-Matter",
	]);
	assert.equal(
		content.recommendations.filter(
			(value) => value.toLowerCase() === "eliostruyf.vscode-front-matter",
		).length,
		1,
	);
});

test("mergeVSCodeSettings preserves unrelated settings and updates managed keys", () => {
	assert.deepEqual(
		mergeVSCodeSettings(
			{
				"editor.tabSize": 2,
				"frontMatter.dashboard.openOnStart": true,
			},
			{
				"frontMatter.dashboard.openOnStart": false,
			},
		),
		{
			"editor.tabSize": 2,
			"frontMatter.dashboard.openOnStart": false,
		},
	);
});

test("applyEditorUpdates writes exactly the planned editor files", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	const plan = await planEditorUpdates(siteRoot);
	const result = await applyEditorUpdates(plan);

	assert.deepEqual(
		result.actions.map((action) => action.status),
		["written", "written", "written"],
	);
	assert.equal(existsSync(path.join(siteRoot, "frontmatter.json")), true);
	assert.equal(
		existsSync(path.join(siteRoot, ".vscode", "extensions.json")),
		true,
	);
	assert.equal(
		existsSync(path.join(siteRoot, ".vscode", "settings.json")),
		true,
	);

	for (const action of plan.actions) {
		const actual = await readFile(path.join(siteRoot, action.file), "utf8");
		assert.equal(actual, action.content);
	}
});

test("applyEditorUpdates backs up existing editor files under .backup", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(siteRoot, ".vscode"), { recursive: true });
	await writeFile(path.join(siteRoot, "frontmatter.json"), "{\"old\":true}\n", "utf8");
	await writeFile(
		path.join(siteRoot, ".vscode", "extensions.json"),
		"{\"recommendations\":[\"custom.publisher\"]}\n",
		"utf8",
	);
	await writeFile(
		path.join(siteRoot, ".vscode", "settings.json"),
		"{\"editor.tabSize\":2}\n",
		"utf8",
	);

	const plan = await planEditorUpdates(siteRoot);
	const result = await applyEditorUpdates(plan, {
		now: new Date("2026-05-03T04:05:06"),
	});

	assert.equal(
		await readFile(
			path.join(siteRoot, ".backup", "20260503-040506", "frontmatter.json"),
			"utf8",
		),
		"{\"old\":true}\n",
	);
	assert.equal(
		await readFile(
			path.join(
				siteRoot,
				".backup",
				"20260503-040506",
				".vscode",
				"extensions.json",
			),
			"utf8",
		),
		"{\"recommendations\":[\"custom.publisher\"]}\n",
	);
	assert.equal(
		await readFile(
			path.join(
				siteRoot,
				".backup",
				"20260503-040506",
				".vscode",
				"settings.json",
			),
			"utf8",
		),
		"{\"editor.tabSize\":2}\n",
	);
	assert.equal(
		result.actions.every((action) => action.backupPath),
		true,
	);
});
