import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { siteConfig } from "../config";
import {
	getStandaloneRoutePublicPath,
	resolveAstroBuildConfig,
} from "./permalink-materialization";

const routeBuildConfig = resolveAstroBuildConfig({
	postsPattern: siteConfig.permalink.postsPattern,
	pagesPattern: siteConfig.permalink.pagesPattern,
	trailingSlash: siteConfig.permalink.trailingSlash,
	postPatternRulePatterns: siteConfig.permalink.postPatternRules.map(
		(rule) => rule.pattern,
	),
});

export function getArchivePath(): string {
	return getStandaloneRoutePublicPath("archive", routeBuildConfig.buildFormat);
}

export function pathsEqual(path1: string, path2: string): boolean {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function getPostUrlBySlug(slug: string): string {
	throw new Error(
		`Use getPostUrlByEntry() or resolved publicPath instead of raw entry id "${slug}".`,
	);
}

export function getPostUrlByEntry(entry: {
	id: string;
	data?: {
		publicPath?: string;
	};
}): string {
	if (!entry.data?.publicPath) {
		throw new Error(`Post entry "${entry.id}" is missing resolved publicPath.`);
	}

	return url(entry.data.publicPath);
}

export function getTagUrl(tag: string): string {
	if (!tag) return url(getArchivePath());
	return url(`${getArchivePath()}?tag=${encodeURIComponent(tag.trim())}`);
}

export function getCategoryUrl(category: string | null): string {
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLowerCase() === i18n(I18nKey.uncategorized).toLowerCase()
	)
		return url(`${getArchivePath()}?uncategorized=true`);
	return url(
		`${getArchivePath()}?category=${encodeURIComponent(category.trim())}`,
	);
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}

export function url(path: string): string {
	return joinUrl("", import.meta.env.BASE_URL, path);
}
