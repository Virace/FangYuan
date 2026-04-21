import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..", "..");
const siteRoot = path.join(repoRoot, "site");
const distRoot = path.join(repoRoot, "dist");
const siteConfigPath = path.join(siteRoot, "config.ts");
const siteAboutPath = path.join(siteRoot, "content", "spec", "about.md");
const postDir = path.join(siteRoot, "content", "posts");

function run(command, args, expectedStatus = 0) {
	const result =
		process.platform === "win32"
			? spawnSync("cmd.exe", ["/c", command, ...args], {
					cwd: repoRoot,
					encoding: "utf8",
					env: { ...process.env, CI: "1" },
			  })
			: spawnSync(command, args, {
					cwd: repoRoot,
					encoding: "utf8",
					env: { ...process.env, CI: "1" },
			  });

	assert.equal(result.status, expectedStatus, result.stdout + result.stderr);
	return result;
}

export function runBuild(expectedStatus = 0) {
	return run("pnpm", ["build"], expectedStatus);
}

export async function withMutableSiteFixture(t, callback) {
	const originalConfig = existsSync(siteConfigPath)
		? await readFile(siteConfigPath, "utf8")
		: null;
	const originalAbout = existsSync(siteAboutPath)
		? await readFile(siteAboutPath, "utf8")
		: null;
	const createdPaths = [];

	t.after(async () => {
		for (const targetPath of createdPaths.reverse()) {
			await rm(targetPath, { recursive: true, force: true });
		}

		if (originalConfig === null) {
			await rm(siteConfigPath, { force: true });
		} else {
			await writeFile(siteConfigPath, originalConfig, "utf8");
		}

		if (originalAbout === null) {
			await rm(siteAboutPath, { force: true });
		} else {
			await writeFile(siteAboutPath, originalAbout, "utf8");
		}

		await rm(distRoot, { recursive: true, force: true });
	});

	await mkdir(path.dirname(siteConfigPath), { recursive: true });
	await mkdir(path.dirname(siteAboutPath), { recursive: true });
	await mkdir(postDir, { recursive: true });

	await callback({
		distRoot,
		postDir,
		siteAboutPath,
		siteConfigPath,
		markCreated(targetPath) {
			createdPaths.push(targetPath);
			return targetPath;
		},
	});
}
