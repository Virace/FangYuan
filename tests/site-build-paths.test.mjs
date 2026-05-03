import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { resolveSiteBuildPaths } from "../scripts/site/build-paths.mjs";

const repoRoot = path.resolve("fixtures", "fangyuan-root");
const externalSiteRoot = path.resolve("..", "fixture-sites", "x-item.com");

test("resolveSiteBuildPaths keeps default build output in repo dist", () => {
	const paths = resolveSiteBuildPaths({
		cwd: repoRoot,
		env: {},
	});

	assert.equal(paths.outDir, null);
	assert.equal(paths.cacheDir, null);
	assert.equal(paths.shouldCopyOutDir, false);
	assert.equal(paths.pagefindSite, path.join(repoRoot, "dist"));
});

test("resolveSiteBuildPaths uses direct output for custom directories inside the repo", () => {
	const customOutDir = path.join(repoRoot, ".temp", "custom-dist");
	const paths = resolveSiteBuildPaths({
		cwd: repoRoot,
		env: {
			FANGYUAN_BUILD_OUT_DIR: customOutDir,
		},
	});

	assert.equal(paths.outDir, customOutDir);
	assert.equal(paths.finalOutDir, paths.outDir);
	assert.equal(paths.cacheDir, null);
	assert.equal(paths.shouldCopyOutDir, false);
	assert.equal(paths.pagefindSite, paths.outDir);
});

test("resolveSiteBuildPaths stages out-of-repo output inside the repo before copy", () => {
	const externalDist = path.join(externalSiteRoot, "dist");
	const paths = resolveSiteBuildPaths({
		cwd: repoRoot,
		env: {
			FANGYUAN_BUILD_OUT_DIR: externalDist,
		},
	});

	assert.equal(paths.finalOutDir, externalDist);
	assert.match(
		paths.outDir,
		/\.temp[\\/]external-build[\\/][a-f0-9]{12}[\\/]dist$/,
	);
	assert.equal(
		paths.cacheDir,
		path.resolve(path.dirname(paths.outDir), ".astro"),
	);
	assert.equal(paths.shouldCopyOutDir, true);
	assert.equal(paths.pagefindSite, paths.finalOutDir);
});

test("resolveSiteBuildPaths allows an explicit custom cache directory", () => {
	const externalCacheDir = path.join(externalSiteRoot, ".cache", "astro");
	const paths = resolveSiteBuildPaths({
		cwd: repoRoot,
		env: {
			FANGYUAN_BUILD_OUT_DIR: path.join(externalSiteRoot, "dist"),
			FANGYUAN_BUILD_CACHE_DIR: externalCacheDir,
		},
	});

	assert.equal(paths.cacheDir, externalCacheDir);
});
