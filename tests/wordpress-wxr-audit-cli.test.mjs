import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseCliArgs, runWordpressAuditCli } from "../scripts/wp-migration/wordpress-wxr-audit.js";
import { SAMPLE_WXR } from "./test-helpers/wordpress-wxr-fixture.mjs";

test("parseCliArgs keeps report formats and default frontmatter fields", () => {
	const parsed = parseCliArgs([
		"--input",
		"sample.xml",
		"--output",
		"out",
		"--content-types",
		"post,page",
		"--path-mode",
		"flat",
		"--report-formats",
		"json,md,csv",
		"--default-frontmatter",
		"lang=zh_CN",
		"--default-frontmatter",
		"draft=false",
	]);

	assert.equal(parsed.inputPath, "sample.xml");
	assert.deepEqual(parsed.reportFormats, ["json", "md", "csv"]);
	assert.equal(parsed.defaultFrontmatter.lang, "zh_CN");
	assert.equal(parsed.defaultFrontmatter.draft, "false");
});

test("runWordpressAuditCli writes json and markdown reports to output dir", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-wxr-"));
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	const inputPath = path.join(tempRoot, "sample.xml");
	const outputPath = path.join(tempRoot, "audit");
	await writeFile(inputPath, SAMPLE_WXR, "utf8");

	const result = await runWordpressAuditCli(
		[
			"--input",
			inputPath,
			"--output",
			outputPath,
			"--content-types",
			"post",
			"--path-mode",
			"flat",
			"--report-formats",
			"json,md",
			"--wp-permalink-template",
			"/%year%/%monthnum%/%day%/%postname%/",
		],
		{
			cwd: tempRoot,
		},
	);

	assert.equal(result.writtenFiles.length, 2);
	assert.match(
		await readFile(path.join(outputPath, "audit-summary.md"), "utf8"),
		/Hello World/,
	);
	assert.match(
		await readFile(path.join(outputPath, "audit-report.json"), "utf8"),
		/legacyId/,
	);
});
