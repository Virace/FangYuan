import path from "node:path";
import { createHash } from "node:crypto";

function isInsideDirectory(parent, target) {
	const relativePath = path.relative(parent, target);

	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
	);
}

function buildStagingName(outDir) {
	return createHash("sha1").update(outDir).digest("hex").slice(0, 12);
}

export function resolveSiteBuildPaths({
	cwd = process.cwd(),
	env = process.env,
} = {}) {
	const configuredOutDir = env.FANGYUAN_BUILD_OUT_DIR?.trim();

	if (!configuredOutDir) {
		return {
			finalOutDir: path.resolve(cwd, "dist"),
			cacheDir: null,
			outDir: null,
			shouldCopyOutDir: false,
			pagefindSite: path.resolve(cwd, "dist"),
		};
	}

	const finalOutDir = path.resolve(cwd, configuredOutDir);
	const configuredCacheDir = env.FANGYUAN_BUILD_CACHE_DIR?.trim();
	const useDirectOutDir = isInsideDirectory(cwd, finalOutDir);
	const stagingRoot = path.join(cwd, ".temp", "external-build");
	const outDir = useDirectOutDir
		? finalOutDir
		: path.join(stagingRoot, buildStagingName(finalOutDir), "dist");
	const cacheDir =
		configuredCacheDir
			? path.resolve(cwd, configuredCacheDir)
			: useDirectOutDir
				? null
				: path.join(stagingRoot, buildStagingName(finalOutDir), ".astro");

	return {
		finalOutDir,
		cacheDir,
		outDir,
		shouldCopyOutDir: outDir !== finalOutDir,
		pagefindSite: finalOutDir,
	};
}
