import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..", "..");
const distRoot = path.join(repoRoot, "dist");
const astroGeneratedRoot = path.join(repoRoot, ".astro");
const astroContentDataStore = path.join(
	repoRoot,
	"node_modules",
	".astro",
	"data-store.json",
);
const tempSitesRoot = path.join(repoRoot, ".temp", "test-sites");
const buildLockRoot = path.join(tempSitesRoot, ".build-lock");

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function acquireBuildLock() {
	await mkdir(tempSitesRoot, { recursive: true });

	for (;;) {
		try {
			await mkdir(buildLockRoot);
			return;
		} catch (error) {
			if (error && typeof error === "object" && error.code === "EEXIST") {
				await sleep(100);
				continue;
			}

			throw error;
		}
	}
}

function run(command, args, expectedStatus = 0, extraEnv = {}) {
	const result =
		process.platform === "win32"
			? spawnSync("cmd.exe", ["/c", command, ...args], {
					cwd: repoRoot,
					encoding: "utf8",
					env: { ...process.env, CI: "1", ...extraEnv },
			  })
			: spawnSync(command, args, {
					cwd: repoRoot,
					encoding: "utf8",
					env: { ...process.env, CI: "1", ...extraEnv },
			  });

	assert.equal(result.status, expectedStatus, result.stdout + result.stderr);
	return result;
}

function resetGeneratedContentCache() {
	rmSync(distRoot, { recursive: true, force: true });
	rmSync(astroGeneratedRoot, { recursive: true, force: true });
	rmSync(astroContentDataStore, { force: true });
}

export function runBuild(expectedStatus = 0, extraEnv = {}) {
	resetGeneratedContentCache();
	return run("pnpm", ["build"], expectedStatus, extraEnv);
}

export async function withExternalSiteFixture(t, callback) {
	await mkdir(tempSitesRoot, { recursive: true });
	const fixtureRoot = await mkdtemp(path.join(tempSitesRoot, "fangyuan-site-"));
	const previousMode = process.env.FANGYUAN_SITE_MODE;
	const previousRoot = process.env.FANGYUAN_SITE_ROOT;

	await acquireBuildLock();

	process.env.FANGYUAN_SITE_MODE = "external";
	process.env.FANGYUAN_SITE_ROOT = fixtureRoot;

	t.after(async () => {
		if (previousMode === undefined) {
			delete process.env.FANGYUAN_SITE_MODE;
		} else {
			process.env.FANGYUAN_SITE_MODE = previousMode;
		}

		if (previousRoot === undefined) {
			delete process.env.FANGYUAN_SITE_ROOT;
		} else {
			process.env.FANGYUAN_SITE_ROOT = previousRoot;
		}

		await rm(fixtureRoot, { recursive: true, force: true });
		await rm(distRoot, { recursive: true, force: true });
		await rm(buildLockRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(fixtureRoot, "content", "posts"), { recursive: true });
	await mkdir(path.join(fixtureRoot, "content", "spec"), { recursive: true });

	await callback({
		distRoot,
		fixtureRoot,
		postDir: path.join(fixtureRoot, "content", "posts"),
		specDir: path.join(fixtureRoot, "content", "spec"),
		siteAboutPath: path.join(fixtureRoot, "content", "spec", "about.md"),
		siteConfigPath: path.join(fixtureRoot, "site.config.yaml"),
		runExternalBuild(expectedStatus = 0) {
			resetGeneratedContentCache();
			return run("pnpm", ["build"], expectedStatus, {
				FANGYUAN_SITE_MODE: "external",
				FANGYUAN_SITE_ROOT: fixtureRoot,
			});
		},
		markCreated(targetPath) {
			return targetPath;
		},
	});
}

export async function withMutableSiteFixture(t, callback) {
	return withExternalSiteFixture(t, callback);
}
