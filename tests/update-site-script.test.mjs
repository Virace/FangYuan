import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";

import {
	main,
	parseUpdateSiteArgs,
} from "../scripts/site/update-site.js";

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

test("parseUpdateSiteArgs defaults to dry-run mode", () => {
	assert.deepEqual(parseUpdateSiteArgs(["--site-root", "demo"]), {
		siteRoot: "demo",
		mode: "dry-run",
		includeFrontmatter: true,
		includeVSCode: true,
		includeConfig: true,
		help: false,
	});
});

test("main rejects --dry-run and --apply together", async () => {
	const io = createIo();
	const code = await main(["--site-root", "demo", "--dry-run", "--apply"], io);

	assert.equal(code, 1);
	assert.match(io.errors.join(""), /mutually exclusive/i);
});

test("main requires --site-root", async () => {
	const io = createIo();
	const code = await main([], io);

	assert.equal(code, 1);
	assert.match(io.errors.join(""), /--site-root/);
});

test("main rejects --site-root without a path value", async () => {
	const io = createIo();
	const code = await main(["--site-root", "--apply"], io);

	assert.equal(code, 1);
	assert.match(io.errors.join(""), /--site-root/);
});

test("main prints help without requiring site root", async () => {
	const io = createIo();
	const code = await main(["--help"], io);

	assert.equal(code, 0);
	assert.match(io.output.join(""), /update-site\.js/);
});

test("main dry-run does not write files", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await writeFile(
		path.join(siteRoot, "site.config.yaml"),
		`siteConfig:
  title: Demo
`,
		"utf8",
	);

	const io = createIo();
	const code = await main(["--site-root", siteRoot], io);

	assert.equal(code, 0);
	assert.match(io.output.join(""), /Mode: dry-run/);
	assert.equal(existsSync(path.join(siteRoot, "frontmatter.json")), false);
	assert.equal(
		parse(await readFile(path.join(siteRoot, "site.config.yaml"), "utf8"))
			.fangyuanConfigVersion,
		undefined,
	);
});

test("main apply writes editor files and migrates config with backup", async (t) => {
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
	await writeFile(
		path.join(siteRoot, "site.config.yaml"),
		`siteConfig:
  title: Demo
`,
		"utf8",
	);

	const io = createIo();
	const code = await main(
		["--site-root", siteRoot, "--apply"],
		{
			...io,
			now: new Date("2026-05-03T04:05:06"),
		},
	);

	assert.equal(code, 0);
	assert.equal(existsSync(path.join(siteRoot, "frontmatter.json")), true);
	assert.equal(
		existsSync(path.join(siteRoot, ".vscode", "extensions.json")),
		true,
	);
	assert.equal(
		parse(await readFile(path.join(siteRoot, "site.config.yaml"), "utf8"))
			.fangyuanConfigVersion,
		1,
	);
	assert.equal(
		existsSync(
			path.join(
				siteRoot,
				".backup",
				"20260503-040506",
				"frontmatter.json",
			),
		),
		true,
	);
	assert.equal(
		existsSync(
			path.join(
				siteRoot,
				".backup",
				"20260503-040506",
				".vscode",
				"extensions.json",
			),
		),
		true,
	);
	assert.equal(
		existsSync(
			path.join(
				siteRoot,
				".backup",
				"20260503-040506",
				".vscode",
				"settings.json",
			),
		),
		true,
	);
	assert.equal(
		existsSync(
			path.join(
				siteRoot,
				".backup",
				"20260503-040506",
				"site.config.yaml",
			),
		),
		true,
	);
	assert.match(io.output.join(""), /site\.config\.yaml: add fangyuanConfigVersion/);
	assert.match(io.output.join(""), /site\.config\.yaml: add siteConfig\.postSort/);
	assert.match(io.output.join(""), /Backups:/);
	assert.match(io.output.join(""), /frontmatter\.json/);
	assert.match(io.output.join(""), /\.vscode\\extensions\.json|\.vscode\/extensions\.json/);
});

test("main apply blocks manual config actions with exit code 2", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await writeFile(
		path.join(siteRoot, "site.config.yaml"),
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

	const io = createIo();
	const code = await main(["--site-root", siteRoot, "--apply"], io);

	assert.equal(code, 2);
	assert.match(io.errors.join(""), /manual actions/i);
	assert.equal(existsSync(path.join(siteRoot, "frontmatter.json")), false);
	assert.equal(existsSync(path.join(siteRoot, ".backup")), false);
});

test("main returns exit code 1 for config parse errors", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await writeFile(path.join(siteRoot, "site.config.yaml"), "siteConfig: [\n", "utf8");

	const io = createIo();
	const code = await main(["--site-root", siteRoot], io);

	assert.equal(code, 1);
	assert.match(io.errors.join(""), /failed/i);
	assert.equal(existsSync(path.join(siteRoot, ".backup")), false);
});

test("main supports skip flags", async (t) => {
	const siteRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-update-"));
	t.after(async () => {
		await rm(siteRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(siteRoot, ".vscode"), { recursive: true });
	await writeFile(path.join(siteRoot, ".vscode", "settings.json"), "{}\n", "utf8");

	const code = await main(
		["--site-root", siteRoot, "--apply", "--no-frontmatter", "--no-config"],
		createIo(),
	);

	assert.equal(code, 0);
	assert.equal(existsSync(path.join(siteRoot, "frontmatter.json")), false);
	assert.equal(
		existsSync(path.join(siteRoot, ".vscode", "extensions.json")),
		true,
	);
	assert.equal(existsSync(path.join(siteRoot, "site.config.yaml")), false);
});
