import path from "node:path";

export const devWatchIgnoredDirs = [
	".astro",
	".backup",
	".frontmatter",
	".github",
	".playwright-mcp",
	".serena",
	".temp",
	".vscode",
	".wrangler",
	"dist",
	"docs",
	"node_modules",
	"playwright-report",
	"public",
	"scripts",
	"test-results",
	"tests",
];

function normalizePath(value) {
	return value.replace(/\\/g, "/");
}

export function resolveDevWatchIgnoredPatterns(rootDir = process.cwd()) {
	const normalizedRoot = normalizePath(path.resolve(rootDir));
	return devWatchIgnoredDirs.map((dir) => `${normalizedRoot}/${dir}/**`);
}
