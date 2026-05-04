import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	applyContentFrontmatterMigration,
	main,
	migrateMarkdownCommentFrontmatter,
	parseContentFrontmatterMigrationArgs,
	planContentFrontmatterMigration,
} from "../scripts/site/migrate-content-frontmatter.js";

function createIo() {
	const output = [];
	const errors = [];

	return {
		output,
		errors,
		stdout: {
			write(value) {
				output.push(String(value));
			},
		},
		stderr: {
			write(value) {
				errors.push(String(value));
			},
		},
	};
}

test("migrateMarkdownCommentFrontmatter maps open and closed status to boolean comment", () => {
	const open = migrateMarkdownCommentFrontmatter(`---
title: Open
commentStatus: "open"
---
Open body.
`);
	const closed = migrateMarkdownCommentFrontmatter(`---
title: Closed
commentStatus: closed
---
Closed body.
`);

	assert.equal(open.status, "planned");
	assert.match(open.content, /^comment: true$/m);
	assert.doesNotMatch(open.content, /^commentStatus:/m);
	assert.equal(closed.status, "planned");
	assert.match(closed.content, /^comment: false$/m);
	assert.doesNotMatch(closed.content, /^commentStatus:/m);
});

test("migrateMarkdownCommentFrontmatter drops legacy field when comment is already consistent", () => {
	const result = migrateMarkdownCommentFrontmatter(`---
title: Already Migrated
commentStatus: closed
comment: false
---
Body.
`);

	assert.equal(result.status, "planned");
	assert.match(result.content, /^comment: false$/m);
	assert.doesNotMatch(result.content, /^commentStatus:/m);
});

test("migrateMarkdownCommentFrontmatter reports conflicting values as manual", () => {
	const result = migrateMarkdownCommentFrontmatter(`---
title: Conflict
commentStatus: closed
comment: true
---
Body.
`);

	assert.equal(result.status, "manual");
	assert.match(result.reason, /conflicting commentStatus=closed and comment=true/);
	assert.match(result.content, /^commentStatus: closed$/m);
});

test("plan and apply content frontmatter migration only touches safe actions", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-content-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(siteRoot, "content", "posts"), { recursive: true });
	await mkdir(path.join(siteRoot, "content", "spec"), { recursive: true });
	const postPath = path.join(siteRoot, "content", "posts", "open.md");
	const specPath = path.join(siteRoot, "content", "spec", "conflict.md");
	await writeFile(
		postPath,
		`---
title: Open
commentStatus: open
---
Body.
`,
		"utf8",
	);
	await writeFile(
		specPath,
		`---
commentStatus: closed
comment: true
---
Body.
`,
		"utf8",
	);

	const plan = await planContentFrontmatterMigration(siteRoot);

	assert.equal(plan.actions.length, 1);
	assert.equal(plan.actions[0].file, path.join("content", "posts", "open.md"));
	assert.equal(plan.manualActions.length, 1);
	assert.equal(plan.manualActions[0].file, path.join("content", "spec", "conflict.md"));
	assert.match(await readFile(postPath, "utf8"), /^commentStatus: open$/m);

	await applyContentFrontmatterMigration(plan);

	assert.match(await readFile(postPath, "utf8"), /^comment: true$/m);
	assert.doesNotMatch(await readFile(postPath, "utf8"), /^commentStatus:/m);
	assert.match(await readFile(specPath, "utf8"), /^commentStatus: closed$/m);
});

test("main keeps dry-run read-only and blocks apply on manual actions", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-content-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(siteRoot, "content", "posts"), { recursive: true });
	const postPath = path.join(siteRoot, "content", "posts", "closed.md");
	await writeFile(
		postPath,
		`---
title: Closed
commentStatus: closed
---
Body.
`,
		"utf8",
	);

	const dryRunIo = createIo();
	assert.equal(
		await main(
			[
				"--site-root",
				siteRoot,
				"--from",
				"commentStatus",
				"--to",
				"comment",
				"--dry-run",
			],
			dryRunIo,
		),
		0,
	);
	assert.match(dryRunIo.output.join(""), /Mode: dry-run/);
	assert.match(await readFile(postPath, "utf8"), /^commentStatus: closed$/m);

	const applyIo = createIo();
	assert.equal(
		await main(
			[
				"--site-root",
				siteRoot,
				"--from",
				"commentStatus",
				"--to",
				"comment",
				"--apply",
			],
			applyIo,
		),
		0,
	);
	assert.match(await readFile(postPath, "utf8"), /^comment: false$/m);
});

test("parseContentFrontmatterMigrationArgs validates mode and defaults", () => {
	assert.deepEqual(
		parseContentFrontmatterMigrationArgs(["--site-root", "demo"]),
		{
			siteRoot: "demo",
			from: "commentStatus",
			to: "comment",
			mode: "dry-run",
			help: false,
		},
	);
	assert.throws(
		() => parseContentFrontmatterMigrationArgs(["--dry-run", "--apply"]),
		/mutually exclusive/,
	);
});
