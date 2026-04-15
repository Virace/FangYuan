import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

type ContentRoot = "./src/content" | "./site/content";

const repoRoot = process.cwd();
const externalSiteRoot = path.join(repoRoot, "site");
const externalContentRoot = path.join(externalSiteRoot, "content");
const externalConfigPath = path.join(externalSiteRoot, "config.ts");

function directoryHasFiles(directoryPath: string): boolean {
	if (!existsSync(directoryPath)) {
		return false;
	}

	const entries = readdirSync(directoryPath, { withFileTypes: true });
	for (const entry of entries) {
		const entryPath = path.join(directoryPath, entry.name);
		if (entry.isFile()) {
			return true;
		}
		if (entry.isDirectory() && directoryHasFiles(entryPath)) {
			return true;
		}
	}

	return false;
}

export function hasExternalSiteContent(): boolean {
	return directoryHasFiles(externalContentRoot);
}

export function resolveContentRoot(): ContentRoot {
	return hasExternalSiteContent() ? "./site/content" : "./src/content";
}

export function loadExternalExpressiveCodeConfig():
	| { theme?: string }
	| null {
	if (!existsSync(externalConfigPath)) {
		return null;
	}

	const source = readFileSync(externalConfigPath, "utf8");
	const exportMatch = source.match(
		/export const expressiveCodeConfig = \{([\s\S]*?)\};?/,
	);
	if (!exportMatch) {
		return null;
	}

	const themeMatch = exportMatch[1].match(/theme:\s*["'`]([^"'`]+)["'`]/);
	if (!themeMatch) {
		throw new Error(
			'site/config.ts 中的 expressiveCodeConfig.theme 需要保持字符串字面量。',
		);
	}

	return {
		theme: themeMatch[1],
	};
}

export function loadExternalArtalkDevProxyTarget(): string | null {
	if (!existsSync(externalConfigPath)) {
		return null;
	}

	const source = readFileSync(externalConfigPath, "utf8");
	const targetMatch = source.match(
		/export const artalkDevProxyTarget = ["'`]([^"'`]+)["'`];?/,
	);

	return targetMatch?.[1] ?? null;
}
