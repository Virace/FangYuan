import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import {
	access,
	mkdir,
	mkdtemp,
	readdir,
	rm,
	rmdir,
	stat,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..", "..");
const astroGeneratedRoot = path.join(repoRoot, ".astro");
const testBuildsRoot = path.join(repoRoot, ".temp", "test-builds");
const staleRunAgeMs = 24 * 60 * 60 * 1000;
const buildTimeoutMs = 5 * 60 * 1000;

const isolatedEnvironmentKeys = [
	"FANGYUAN_BUILD_CACHE_DIR",
	"FANGYUAN_BUILD_OUT_DIR",
	"FANGYUAN_BASE",
	"FANGYUAN_DEV_BASE",
	"FANGYUAN_SITE",
	"FANGYUAN_SITE_MODE",
	"FANGYUAN_SITE_ROOT",
	"PUBLIC_FANGYUAN_ALLOW_DEMO_QINGYAN",
	"PUBLIC_FANGYUAN_BASE",
	"PUBLIC_FANGYUAN_DEMO_QINGYAN",
	"PUBLIC_FANGYUAN_QINGYAN_API_BASE",
	"PUBLIC_FANGYUAN_QINGYAN_SITE_KEY",
	"PUBLIC_FANGYUAN_SITE",
	"QINGYAN_DEV_PROXY_TARGET",
];

async function pathExists(targetPath) {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function pruneStaleRuns(now = Date.now()) {
	if (!(await pathExists(testBuildsRoot))) {
		return;
	}

	for (const entry of await readdir(testBuildsRoot, { withFileTypes: true })) {
		if (!entry.isDirectory() || !entry.name.startsWith("run-")) {
			continue;
		}

		const runRoot = path.join(testBuildsRoot, entry.name);
		const runStat = await stat(runRoot);
		if (now - runStat.mtimeMs > staleRunAgeMs) {
			await rm(runRoot, { recursive: true, force: true });
		}
	}
}

function createChildEnvironment(scenario, extraEnv) {
	const env = { ...process.env };
	for (const key of isolatedEnvironmentKeys) {
		delete env[key];
	}

	Object.assign(env, {
		CI: "1",
		...extraEnv,
		FANGYUAN_BUILD_CACHE_DIR: scenario.cacheDir,
		FANGYUAN_BUILD_OUT_DIR: scenario.outDir,
		FANGYUAN_SITE_MODE: scenario.siteMode,
	});

	if (scenario.siteMode === "external") {
		env.FANGYUAN_SITE_ROOT = scenario.siteRoot;
	}

	return env;
}

function formatBuildFailure(scenario, result) {
	const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
	const error = result.error ? `\n${result.error.stack ?? result.error}` : "";

	return `Build scenario "${scenario.name}" failed.\n${output}${error}`;
}

function runBuildCommand(scenario, extraEnv) {
	const options = {
		cwd: repoRoot,
		encoding: "utf8",
		env: createChildEnvironment(scenario, extraEnv),
		maxBuffer: 20 * 1024 * 1024,
		timeout: buildTimeoutMs,
	};

	return process.platform === "win32"
		? spawnSync(
				process.env.ComSpec ?? "cmd.exe",
				["/d", "/s", "/c", "pnpm", "build"],
				options,
			)
		: spawnSync("pnpm", ["build"], options);
}

export async function createBuildRun(t) {
	await mkdir(testBuildsRoot, { recursive: true });
	await pruneStaleRuns();

	const runRoot = await mkdtemp(path.join(testBuildsRoot, "run-"));
	const scenarios = new Map();
	let buildCount = 0;

	t.after(async () => {
		await rm(runRoot, { recursive: true, force: true });
		await rm(astroGeneratedRoot, { recursive: true, force: true });
		try {
			await rmdir(testBuildsRoot);
		} catch (error) {
			if (
				!error ||
				typeof error !== "object" ||
				!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)
			) {
				throw error;
			}
		}
	});

	async function createScenario(name, { siteMode = "external" } = {}) {
		assert.match(name, /^[a-z0-9-]+$/);
		assert.equal(scenarios.has(name), false, `Duplicate build scenario: ${name}`);
		assert.ok(
			siteMode === "external" || siteMode === "internal",
			`Unsupported site mode: ${siteMode}`,
		);

		const scenarioRoot = path.join(runRoot, name);
		const siteRoot = path.join(scenarioRoot, "site");
		const contentRoot = path.join(siteRoot, "content");
		const scenario = {
			name,
			siteMode,
			scenarioRoot,
			siteRoot,
			contentRoot,
			postDir: path.join(contentRoot, "posts"),
			specDir: path.join(contentRoot, "spec"),
			siteConfigPath: path.join(siteRoot, "site.config.yaml"),
			siteAboutPath: path.join(contentRoot, "spec", "about.md"),
			outDir: path.join(scenarioRoot, "dist"),
			cacheDir: path.join(scenarioRoot, "cache"),
			built: false,
		};

		await mkdir(scenario.postDir, { recursive: true });
		await mkdir(scenario.specDir, { recursive: true });
		await mkdir(scenario.cacheDir, { recursive: true });
		scenarios.set(name, scenario);
		return scenario;
	}

	function buildScenario(
		scenario,
		{ expectFailure = false, env: extraEnv = {} } = {},
	) {
		assert.equal(
			scenarios.get(scenario.name),
			scenario,
			`Unknown build scenario: ${scenario.name}`,
		);
		assert.equal(
			scenario.built,
			false,
			`Build scenario "${scenario.name}" can only be executed once`,
		);

		scenario.built = true;
		buildCount += 1;
		rmSync(astroGeneratedRoot, { recursive: true, force: true });

		const startedAt = Date.now();
		process.stdout.write(`[build:${scenario.name}] start\n`);
		const result = runBuildCommand(scenario, extraEnv);
		const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
		process.stdout.write(
			`[build:${scenario.name}] status=${result.status ?? "error"} duration=${durationSeconds}s\n`,
		);
		const failureMessage = formatBuildFailure(scenario, result);
		if (expectFailure) {
			assert.notEqual(result.status, 0, `Expected ${failureMessage}`);
		} else {
			assert.equal(result.status, 0, failureMessage);
			assert.equal(
				existsSync(scenario.outDir),
				true,
				`Build scenario "${scenario.name}" did not create its output directory`,
			);
		}

		return Object.freeze({
			...scenario,
			output: [result.stdout, result.stderr].filter(Boolean).join("\n"),
			status: result.status,
		});
	}

	return {
		get buildCount() {
			return buildCount;
		},
		buildScenario,
		createScenario,
		runRoot,
	};
}
