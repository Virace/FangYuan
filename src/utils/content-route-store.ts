import { createHash, randomUUID } from "node:crypto";
import {
	existsSync,
	lstatSync,
	readdirSync,
	readFileSync,
	realpathSync,
} from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { defaultSiteConfig } from "../default-config.ts";
import type { PermalinkConfig } from "../types/config.ts";
import {
	appendRoutePaths,
	type ContentRouteRegistry,
	emptyRouteRegistry,
	inspectContentRoutes,
	isContentId,
	type ManagedContentRoute,
	parseRouteRegistry,
	publicRoutePath,
	type RouteIssue,
	routePathProblem,
} from "./content-route-history.ts";
import { resolvePermalinkForEntry } from "./permalink/resolver.ts";
import { resolveSiteSourceContext } from "./site-source/context.ts";
import { loadExternalSiteConfigYaml } from "./site-source/external-config.ts";
import {
	normalizeConfiguredBase,
	normalizeConfiguredSite,
} from "./site-source/runtime-config.ts";

export type RouteSnapshot = {
	siteRoot: string;
	contentRoot: string;
	registryPath: string;
	registryText: string | null;
	registryBaseline: string | null;
	registry: ContentRouteRegistry;
	routes: ManagedContentRoute[];
	sources: Map<string, string>;
	inputDigest: string;
	base: string;
	site: string | null;
	reservedPaths: string[];
	permalink: PermalinkConfig;
};

export type RouteAnalysis = {
	contentId: string | null;
	currentPath: string;
	currentUrl: string;
	previousPath: string | null;
	history: string[];
	issues: RouteIssue[];
	changed: boolean;
	registryBaseline: string | null;
	registryPath: "content-routes.yaml";
};

export function sourceDigest(source: string): string {
	return createHash("sha256").update(source).digest("hex");
}

function inside(root: string, target: string): boolean {
	const relative = path.relative(root, target);
	return (
		relative === "" ||
		(!path.isAbsolute(relative) &&
			relative !== ".." &&
			!relative.startsWith(`..${path.sep}`))
	);
}

function readInside(root: string, target: string): string {
	if (!inside(realpathSync(root), realpathSync(target)))
		throw new Error(`内容路径越过配置根目录：${target}`);
	return readFileSync(target, "utf8");
}

export function articleFrontmatter(source: string): Record<string, unknown> {
	const match = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
	if (!match) {
		if (/^\uFEFF?---(?:\r?\n|$)/.test(source))
			throw new Error("文章 YAML frontmatter 尚未闭合。");
		return {};
	}
	const value: unknown = parse(match[1]);
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("文章 frontmatter 必须为映射。");
	return value as Record<string, unknown>;
}

export function ensureArticleContentId(
	source: string,
	contentId: string = randomUUID(),
): { source: string; contentId: string } {
	const frontmatter = articleFrontmatter(source);
	if (frontmatter.contentId !== undefined) {
		if (!isContentId(frontmatter.contentId))
			throw new Error("文章 contentId 无效，不能自动替换已有身份。");
		return { source, contentId: frontmatter.contentId };
	}
	const opening = source.match(/^\uFEFF?---(\r?\n)/);
	if (!opening) {
		const newline = source.includes("\r\n") ? "\r\n" : "\n";
		const bom = source.startsWith("\uFEFF") ? "\uFEFF" : "";
		return {
			source: `${bom}---${newline}contentId: ${contentId}${newline}---${newline}${source.slice(bom.length)}`,
			contentId,
		};
	}
	return {
		source: `${opening[0]}contentId: ${contentId}${opening[1]}${source.slice(opening[0].length)}`,
		contentId,
	};
}

function entryRoute(
	sourcePath: string,
	source: string,
	permalink: PermalinkConfig,
): ManagedContentRoute {
	const normalized = sourcePath.replaceAll("\\", "/");
	const match = normalized.match(/(?:^|\/)(posts|spec)\/(.+)\.md$/);
	if (!match)
		throw new Error(
			`只接受 content/posts 或 content/spec 中的 Markdown：${sourcePath}`,
		);
	const frontmatter = articleFrontmatter(source);
	const entryId = match[2].replace(/\/index$/, "");
	const kind = match[1] === "posts" ? "post" : "spec";
	const published = frontmatter.published
		? new Date(String(frontmatter.published))
		: new Date("1970-01-01T00:00:00Z");
	if (Number.isNaN(published.getTime()))
		throw new Error(`${sourcePath} 的 published 日期无效。`);
	if (kind === "post" && !frontmatter.published)
		throw new Error(`${sourcePath} 缺少 published 日期。`);
	if (
		frontmatter.contentId !== undefined &&
		!isContentId(frontmatter.contentId)
	)
		throw new Error(`${sourcePath} 的 contentId 无效。`);
	return {
		contentId: frontmatter.contentId as string | undefined,
		publicPath: resolvePermalinkForEntry({
			entryType: kind,
			entryId,
			fileStem: entryId.split("/").at(-1) ?? entryId,
			alias: typeof frontmatter.alias === "string" ? frontmatter.alias : "",
			permalink:
				typeof frontmatter.permalink === "string" ? frontmatter.permalink : "",
			pattern:
				kind === "post" ? permalink.postsPattern : permalink.pagesPattern,
			postPatternRules: permalink.postPatternRules,
			published,
			aliasValidation: permalink.aliasValidation,
			trailingSlash: permalink.trailingSlash,
		}),
		sourcePath: normalized,
		title: typeof frontmatter.title === "string" ? frontmatter.title : "",
		published: kind !== "post" || frontmatter.draft !== true,
	};
}

export function assertNoRouteSaveLock(siteRoot: string): void {
	if (existsSync(path.join(siteRoot, ".editor", "save-lock.json")))
		throw new Error(
			"检测到 .editor/save-lock.json：文章与路径登记保存尚未完成。请先在 Studio 恢复该次保存，再重新构建。",
		);
}

export function readRouteSnapshot({
	themeRoot = process.cwd(),
	override,
}: {
	themeRoot?: string;
	override?: { path: string; source: string };
} = {}): RouteSnapshot {
	const context = resolveSiteSourceContext({ fangyuanRoot: themeRoot });
	const siteRoot = context.useExternalContent
		? (context.siteRoot ?? themeRoot)
		: themeRoot;
	const contentRoot = path.resolve(themeRoot, context.contentRoot);
	assertNoRouteSaveLock(siteRoot);
	const external =
		context.useExternalConfig && context.externalConfigPath
			? loadExternalSiteConfigYaml(context.externalConfigPath)
			: null;
	const permalink = {
		...defaultSiteConfig.permalink,
		...external?.siteConfig?.permalink,
	};
	const base = normalizeConfiguredBase(
		external?.siteConfig?.base ??
			process.env.FANGYUAN_BASE ??
			defaultSiteConfig.base,
	);
	const site = normalizeConfiguredSite(
		external?.siteConfig?.site ??
			process.env.FANGYUAN_SITE ??
			defaultSiteConfig.site,
	);
	const registryPath = path.join(siteRoot, "content-routes.yaml");
	const registryText = existsSync(registryPath)
		? readInside(siteRoot, registryPath)
		: null;
	const registry =
		registryText === null
			? emptyRouteRegistry()
			: parseRouteRegistry(parse(registryText));
	const sources = new Map<string, string>();
	const digest = createHash("sha256");
	const walk = (directory: string) => {
		if (!existsSync(directory)) return;
		for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
			(left, right) => left.name.localeCompare(right.name),
		)) {
			const target = path.join(directory, entry.name);
			if (entry.isSymbolicLink())
				throw new Error(`内容扫描不接受符号链接：${target}`);
			if (entry.isDirectory()) walk(target);
			else if (entry.isFile() && entry.name.endsWith(".md"))
				sources.set(
					path.relative(siteRoot, target).replaceAll("\\", "/"),
					readInside(contentRoot, target),
				);
		}
	};
	walk(path.join(contentRoot, "posts"));
	walk(path.join(contentRoot, "spec"));
	for (const [sourcePath, source] of sources)
		digest.update(sourcePath).update("\0").update(source).update("\0");
	digest.update(registryText ?? "<missing registry>");
	if (context.useExternalConfig && context.externalConfigPath)
		digest.update(readInside(siteRoot, context.externalConfigPath));
	digest.update(JSON.stringify({ permalink, base, site }));
	if (override) {
		const absolute = path.resolve(siteRoot, override.path);
		if (
			!inside(contentRoot, absolute) ||
			!/^((?:src\/)?content)\/(?:posts|spec)\/.+\.md$/.test(
				path.relative(siteRoot, absolute).replaceAll("\\", "/"),
			)
		)
			throw new Error("文章路径必须位于配置内容根的 posts/spec 中。");
		if (
			existsSync(absolute) &&
			(lstatSync(absolute).isSymbolicLink() ||
				!inside(realpathSync(contentRoot), realpathSync(absolute)))
		)
			throw new Error("文章真实路径越过内容根目录。");
		sources.set(
			path.relative(siteRoot, absolute).replaceAll("\\", "/"),
			override.source,
		);
	}
	const routes = [...sources].map(([sourcePath, source]) =>
		entryRoute(sourcePath, source, permalink),
	);
	const archivePath = resolvePermalinkForEntry({
		entryType: "spec",
		entryId: "archive",
		fileStem: "archive",
		pattern: permalink.pagesPattern,
		published: new Date("1970-01-01T00:00:00Z"),
		aliasValidation: permalink.aliasValidation,
		trailingSlash: permalink.trailingSlash,
	});
	assertNoRouteSaveLock(siteRoot);
	return {
		siteRoot,
		contentRoot,
		registryPath,
		registryText,
		registryBaseline: registryText === null ? null : sourceDigest(registryText),
		registry,
		routes,
		sources,
		inputDigest: digest.digest("hex"),
		base,
		site,
		reservedPaths: [archivePath],
		permalink,
	};
}

export function assertRouteSnapshot(
	snapshot: RouteSnapshot,
): ReturnType<typeof inspectContentRoutes> {
	const result = inspectContentRoutes(snapshot);
	const errors = result.issues.filter((issue) => issue.severity === "error");
	if (errors.length)
		throw new Error(
			`内容路由校验失败：\n${errors.map((issue) => `[${issue.code}] ${issue.message}`).join("\n")}`,
		);
	return result;
}

export function prepareArticleRetirement({
	themeRoot = process.cwd(),
	path: sourcePath,
	source,
}: {
	themeRoot?: string;
	path: string;
	source: string;
}): {
	contentId: string | null;
	currentPath: string;
	source: string;
	registryText: string | null;
	registryBaseline: string | null;
	issues: RouteIssue[];
} {
	const snapshot = readRouteSnapshot({
		themeRoot,
		override: { path: sourcePath, source },
	});
	const relative = path
		.relative(snapshot.siteRoot, path.resolve(snapshot.siteRoot, sourcePath))
		.replaceAll("\\", "/");
	const current = snapshot.routes.find(
		(route) => route.sourcePath === relative,
	);
	if (!current) throw new Error("无法解析待回收文章的地址。");
	const contentId = current.contentId ?? null;
	let registry = snapshot.registry;
	if (contentId) {
		registry = appendRoutePaths(registry, contentId, [current.publicPath]);
		registry.documents[contentId].retired = true;
	}
	const inspected = inspectContentRoutes({
		...snapshot,
		registry,
		routes: snapshot.routes.filter((route) => route.sourcePath !== relative),
	});
	return {
		contentId,
		currentPath: current.publicPath,
		source,
		registryText: contentId ? stringify(registry) : snapshot.registryText,
		registryBaseline: snapshot.registryBaseline,
		issues: inspected.issues,
	};
}

export function analyzeArticleRoute({
	themeRoot = process.cwd(),
	path: sourcePath,
	source,
	prepare = false,
}: {
	themeRoot?: string;
	path: string;
	source: string;
	prepare?: boolean;
}): RouteAnalysis & {
	source?: string;
	registryText?: string;
	routeChange?: Omit<
		RouteAnalysis,
		"issues" | "currentUrl" | "registryBaseline" | "registryPath"
	>;
} {
	const prepared = prepare ? ensureArticleContentId(source) : null;
	const candidate = readRouteSnapshot({
		themeRoot,
		override: { path: sourcePath, source: prepared?.source ?? source },
	});
	const relative = path
		.relative(candidate.siteRoot, path.resolve(candidate.siteRoot, sourcePath))
		.replaceAll("\\", "/");
	let previous: ManagedContentRoute | undefined;
	let previousProblem: string | null = null;
	const diskPath = path.resolve(candidate.siteRoot, relative);
	if (existsSync(diskPath)) {
		const diskSource = readInside(candidate.contentRoot, diskPath);
		try {
			const route = entryRoute(relative, diskSource, candidate.permalink);
			const problem = routePathProblem(route.publicPath);
			if (problem) throw new Error(problem);
			previous = route;
		} catch (error) {
			previousProblem = error instanceof Error ? error.message : String(error);
		}
	}
	const current = candidate.routes.find(
		(route) => route.sourcePath === relative,
	);
	if (!current) throw new Error("无法解析当前文章路径。");
	const contentId = current.contentId ?? null;
	let registry = candidate.registry;
	if (prepare && contentId)
		registry = appendRoutePaths(registry, contentId, [
			...(previous && (!previous.contentId || previous.contentId === contentId)
				? [previous.publicPath]
				: []),
			current.publicPath,
		]);
	const inspected = inspectContentRoutes({
		...candidate,
		registry,
		requireRegistry: false,
	});
	if (previousProblem)
		inspected.issues.push({
			code: "previous-route-invalid",
			severity: "warning",
			message: `磁盘原稿的地址无法计算，已按修正稿校验；既有登记继续保留。${previousProblem}`,
			path: relative,
		});
	if (previous?.contentId && previous.contentId !== contentId)
		inspected.issues.push({
			code: "identity-changed",
			severity: "error",
			message:
				"不能在原文章上删除或替换 contentId；请恢复原身份。新文章请使用独立路径。",
			path: relative,
			contentId: previous.contentId,
		});
	const history = contentId
		? (registry.documents[contentId]?.paths.filter(
				(routePath) => routePath !== current.publicPath,
			) ?? [])
		: [];
	const recorded = contentId
		? candidate.registry.documents[contentId]?.paths
		: undefined;
	const previousPath =
		previous && previous.publicPath !== current.publicPath
			? previous.publicPath
			: recorded?.length && !recorded.includes(current.publicPath)
				? (recorded.at(-1) ?? null)
				: (previous?.publicPath ?? null);
	const changed =
		(previousPath !== null && previousPath !== current.publicPath) ||
		(!!previous?.contentId && !recorded?.includes(current.publicPath));
	const routeChange = {
		contentId,
		currentPath: current.publicPath,
		previousPath,
		history,
		changed,
	};
	return {
		...routeChange,
		currentUrl: candidate.site
			? new URL(
					publicRoutePath(current.publicPath, candidate.base),
					candidate.site,
				).href
			: publicRoutePath(current.publicPath, candidate.base),
		issues: inspected.issues,
		registryBaseline: candidate.registryBaseline,
		registryPath: "content-routes.yaml",
		...(prepare
			? {
					source: prepared?.source,
					registryText: stringify(registry),
					routeChange,
				}
			: {}),
	};
}
