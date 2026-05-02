import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { resolveSiteBuildPaths } from "../scripts/site/build-paths.mjs";

test("resolveSiteBuildPaths keeps default build output in repo dist", () => {
	const paths = resolveSiteBuildPaths({
		cwd: "H:/Programming/Web/FangYuan",
		env: {},
	});

	assert.equal(paths.outDir, null);
	assert.equal(paths.cacheDir, null);
	assert.equal(paths.shouldCopyOutDir, false);
	assert.equal(
		paths.pagefindSite,
		path.resolve("H:/Programming/Web/FangYuan", "dist"),
	);
});

test("resolveSiteBuildPaths uses direct output for custom directories inside the repo", () => {
	const paths = resolveSiteBuildPaths({
		cwd: "H:/Programming/Web/FangYuan",
		env: {
			FANGYUAN_BUILD_OUT_DIR: "H:/Programming/Web/FangYuan/.temp/custom-dist",
		},
	});

	assert.equal(
		paths.outDir,
		path.resolve("H:/Programming/Web/FangYuan/.temp/custom-dist"),
	);
	assert.equal(paths.finalOutDir, paths.outDir);
	assert.equal(paths.cacheDir, null);
	assert.equal(paths.shouldCopyOutDir, false);
	assert.equal(paths.pagefindSite, paths.outDir);
});

test("resolveSiteBuildPaths stages out-of-repo output inside the repo before copy", () => {
	const paths = resolveSiteBuildPaths({
		cwd: "H:/Programming/Web/FangYuan",
		env: {
			FANGYUAN_BUILD_OUT_DIR: "E:/Project/Activate/x-item.com/dist",
		},
	});

	assert.equal(
		paths.finalOutDir,
		path.resolve("E:/Project/Activate/x-item.com/dist"),
	);
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
	const paths = resolveSiteBuildPaths({
		cwd: "H:/Programming/Web/FangYuan",
		env: {
			FANGYUAN_BUILD_OUT_DIR: "E:/Project/Activate/x-item.com/dist",
			FANGYUAN_BUILD_CACHE_DIR: "E:/Project/Activate/x-item.com/.cache/astro",
		},
	});

	assert.equal(
		paths.cacheDir,
		path.resolve("E:/Project/Activate/x-item.com/.cache/astro"),
	);
});
