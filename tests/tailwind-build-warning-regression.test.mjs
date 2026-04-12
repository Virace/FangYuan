import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");
const shellCommand =
	process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "sh";
const shellArgs =
	process.platform === "win32"
		? ["/d", "/s", "/c", "pnpm build"]
		: ["-lc", "pnpm build"];

test("build output should not contain Tailwind CSS optimization warnings", async () => {
	const { stdout, stderr } = await execFileAsync(shellCommand, shellArgs, {
		cwd: repoRoot,
		env: process.env,
		maxBuffer: 10 * 1024 * 1024,
	});
	const output = `${stdout}\n${stderr}`;

	assert.doesNotMatch(
		output,
		/Found \d+ warnings while optimizing generated CSS:/,
		"Build should not report CSS optimization warnings after the Tailwind v4 migration cleanup",
	);
	assert.doesNotMatch(
		output,
		/Unexpected token Delim\('&'\)/,
		"Build should not emit invalid escaped CSS variable tokens in generated CSS",
	);
});

test("app shell components should not keep legacy inline color utilities", async () => {
	const filesToCheck = [
		path.join(repoRoot, "src", "layouts", "MainGridLayout.astro"),
		path.join(repoRoot, "src", "components", "ArchivePanel.svelte"),
		path.join(repoRoot, "src", "components", "Footer.astro"),
		path.join(repoRoot, "src", "components", "widget", "DisplaySettings.svelte"),
		path.join(repoRoot, "src", "components", "widget", "Profile.astro"),
	];
	const legacyInlineColorPattern =
		/(?:text|bg|border)-\[(?:var\(--|oklch\()/;

	for (const filePath of filesToCheck) {
		const source = await readFile(filePath, "utf8");

		assert.doesNotMatch(
			source,
			legacyInlineColorPattern,
			`${path.relative(repoRoot, filePath)} should use token-backed Tailwind v4 utilities instead of legacy inline color utilities`,
		);
	}
});
