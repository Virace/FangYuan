import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
	AliasValidationMode,
	TrailingSlashStrategy,
	UpdatedDateFallback,
	UpdatedDateMode,
} from "../types/config";

type ContentRoot = "./src/content" | "./site/content";

export type ExternalPermalinkConfig = {
	postsPattern?: string | null;
	pagesPattern?: string | null;
	trailingSlash?: TrailingSlashStrategy | null;
	aliasValidation?: AliasValidationMode | null;
	updatedDateMode?: UpdatedDateMode | null;
	updatedDateFallback?: UpdatedDateFallback | null;
	postPatternRulePatterns: string[];
};

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

function findObjectLiteralBlock(source: string, anchor: string): string | null {
	const anchorIndex = source.indexOf(anchor);
	if (anchorIndex < 0) {
		return null;
	}

	const blockStart = source.indexOf("{", anchorIndex);
	if (blockStart < 0) {
		return null;
	}

	let depth = 0;
	let quote: '"' | "'" | "`" | null = null;
	let escaped = false;

	for (let index = blockStart; index < source.length; index += 1) {
		const char = source[index];

		if (quote) {
			if (escaped) {
				escaped = false;
				continue;
			}

			if (char === "\\") {
				escaped = true;
				continue;
			}

			if (char === quote) {
				quote = null;
			}
			continue;
		}

		if (char === '"' || char === "'" || char === "`") {
			quote = char;
			continue;
		}

		if (char === "{") {
			depth += 1;
			continue;
		}

		if (char === "}") {
			depth -= 1;
			if (depth === 0) {
				return source.slice(blockStart + 1, index);
			}
		}
	}

	return null;
}

function loadExternalSiteConfigSource(): string | null {
	if (!existsSync(externalConfigPath)) {
		return null;
	}

	return readFileSync(externalConfigPath, "utf8");
}

function readLiteralField(block: string, field: string): string | null {
	return (
		block.match(new RegExp(`${field}:\\s*["'\`]([^"'\\\`]+)["'\`]`))?.[1] ??
		null
	);
}

export function hasExternalSiteContent(): boolean {
	return directoryHasFiles(externalContentRoot);
}

export function resolveContentRoot(): ContentRoot {
	return hasExternalSiteContent() ? "./site/content" : "./src/content";
}

export function normalizeAliasOrThrow(
	alias: string,
	mode: AliasValidationMode,
): string {
	const normalizedAlias = alias.trim();
	if (!normalizedAlias.includes(".")) {
		return normalizedAlias;
	}

	if (mode === "normalize") {
		return normalizedAlias.replace(/\.+/g, "-");
	}

	throw new Error(`alias "${normalizedAlias}" must not contain "."`);
}

export function extractExternalPermalinkConfig(
	source: string,
): ExternalPermalinkConfig | null {
	const siteConfigBlock = findObjectLiteralBlock(
		source,
		"export const siteConfig",
	);
	if (!siteConfigBlock) {
		return null;
	}

	const permalinkBlock = findObjectLiteralBlock(siteConfigBlock, "permalink");
	if (!permalinkBlock) {
		return null;
	}

	const postPatternRulePatterns = [
		...permalinkBlock.matchAll(/pattern:\s*["'`]([^"'`]+)["'`]/g),
	].map((match) => match[1]);

	return {
		postsPattern: readLiteralField(permalinkBlock, "postsPattern"),
		pagesPattern: readLiteralField(permalinkBlock, "pagesPattern"),
		trailingSlash: readLiteralField(
			permalinkBlock,
			"trailingSlash",
		) as TrailingSlashStrategy | null,
		aliasValidation: readLiteralField(
			permalinkBlock,
			"aliasValidation",
		) as AliasValidationMode | null,
		updatedDateMode: readLiteralField(
			permalinkBlock,
			"updatedDateMode",
		) as UpdatedDateMode | null,
		updatedDateFallback: readLiteralField(
			permalinkBlock,
			"updatedDateFallback",
		) as UpdatedDateFallback | null,
		postPatternRulePatterns,
	};
}

export function loadExternalPermalinkConfig(): ExternalPermalinkConfig | null {
	const source = loadExternalSiteConfigSource();
	if (!source) {
		return null;
	}

	return extractExternalPermalinkConfig(source);
}

export function loadExternalExpressiveCodeConfig(): { theme?: string } | null {
	const source = loadExternalSiteConfigSource();
	if (!source) {
		return null;
	}

	const exportBlock = findObjectLiteralBlock(
		source,
		"export const expressiveCodeConfig",
	);
	if (!exportBlock) {
		return null;
	}

	const themeMatch = exportBlock.match(/theme:\s*["'`]([^"'`]+)["'`]/);
	if (!themeMatch) {
		throw new Error(
			"site/config.ts 中的 expressiveCodeConfig.theme 需要保持字符串字面量。",
		);
	}

	return {
		theme: themeMatch[1],
	};
}

export function loadExternalQingYanDevProxyTarget(): string | null {
	const source = loadExternalSiteConfigSource();
	if (!source) {
		return null;
	}

	const targetMatch = source.match(
		/export const qingyanDevProxyTarget = ["'`]([^"'`]+)["'`];?/,
	);

	return targetMatch?.[1] ?? null;
}
