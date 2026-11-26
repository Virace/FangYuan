import { materializePublicPath } from "./permalink/materialization.ts";

export type RouteIssue = {
	code: string;
	severity: "error" | "warning";
	message: string;
	path?: string;
	contentId?: string;
	ownerId?: string;
};

export type ContentRouteRegistry = {
	version: 1;
	documents: Record<string, { paths: string[]; retired?: boolean }>;
};

export type ManagedContentRoute = {
	contentId?: string;
	publicPath: string;
	sourcePath: string;
	title?: string;
	published: boolean;
};

export type HistoryRedirect = {
	contentId: string;
	publicPath: string;
	targetPath: string;
	outputPath: string;
};

export function emptyRouteRegistry(): ContentRouteRegistry {
	return { version: 1, documents: Object.create(null) };
}

export function isContentId(value: unknown): value is string {
	return (
		typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)
	);
}

export function parseRouteRegistry(value: unknown): ContentRouteRegistry {
	if (
		!value ||
		typeof value !== "object" ||
		!("version" in value) ||
		value.version !== 1 ||
		!("documents" in value) ||
		!value.documents ||
		typeof value.documents !== "object" ||
		Array.isArray(value.documents)
	) {
		throw new Error(
			"content-routes.yaml 必须使用 version: 1 和 documents 映射。",
		);
	}
	const documents: ContentRouteRegistry["documents"] = Object.create(null);
	for (const [contentId, document] of Object.entries(value.documents)) {
		if (
			!isContentId(contentId) ||
			!document ||
			typeof document !== "object" ||
			!("paths" in document) ||
			!Array.isArray(document.paths) ||
			document.paths.length === 0 ||
			!document.paths.every(
				(routePath: unknown) => typeof routePath === "string",
			)
		) {
			throw new Error(
				`content-routes.yaml 中 ${contentId} 的 paths 必须为非空路径列表，身份必须是有效稳定 ID。`,
			);
		}
		if ("retired" in document && typeof document.retired !== "boolean")
			throw new Error(
				`content-routes.yaml 中 ${contentId} 的 retired 必须为布尔值。`,
			);
		documents[contentId] = {
			paths: [...new Set<string>(document.paths)],
			...("retired" in document && document.retired ? { retired: true } : {}),
		};
	}
	return { version: 1, documents };
}

function decodedPath(value: string): string {
	return decodeURIComponent(value).normalize("NFC");
}

export function routePathProblem(publicPath: string): string | null {
	if (
		!publicPath.startsWith("/") ||
		publicPath.startsWith("//") ||
		/[?#\\]/.test(publicPath) ||
		[...publicPath].some(
			(character) =>
				character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
		)
	)
		return "地址必须是本网站的绝对路径，且不能包含查询、片段或反斜杠。";
	let decoded: string;
	try {
		decoded = decodedPath(publicPath);
	} catch {
		return "地址包含无效的百分号编码。";
	}
	if (
		/[?#\\<>:"|*]/.test(decoded) ||
		[...decoded].some(
			(character) =>
				character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
		) ||
		/%2f/i.test(publicPath)
	)
		return "地址包含不能安全物化为静态文件的字符或编码分隔符。";
	if (
		decoded
			.split("/")
			.some(
				(segment) =>
					segment === "." ||
					segment === ".." ||
					/[. ]$/.test(segment) ||
					/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment),
			)
	)
		return "地址包含目录穿越、Windows 保留名称或不支持的末尾字符。";
	return null;
}

function comparablePath(value: string): string {
	return decodedPath(value).replace(/\/+$/, "") || "/";
}

export function outputPathKey(publicPath: string): string {
	return decodedPath(
		materializePublicPath(publicPath).outputPath,
	).toLowerCase();
}

export function isReservedRoute(
	publicPath: string,
	reservedPaths: string[] = [],
): boolean {
	const key = comparablePath(publicPath).toLowerCase();
	const outputKey = outputPathKey(publicPath);
	const reservedOutputs = [
		"index.html",
		"404.html",
		"404/index.html",
		"archive.html",
		"archive/index.html",
		"rss.xml",
		"robots.txt",
		"sitemap.xml",
		"sitemap-0.xml",
		"sitemap-index.xml",
		"content-index.json",
		...reservedPaths.map((item) => outputPathKey(item)),
	];
	return (
		reservedOutputs.some(
			(reserved) =>
				outputKey === reserved ||
				outputKey.startsWith(`${reserved}/`) ||
				reserved.startsWith(`${outputKey}/`),
		) ||
		key === "/" ||
		/^\/page(?:\/|$)/.test(key) ||
		/^\/(?:static|_astro|_image|_fonts|_studio|pagefind)(?:\/|$)/.test(key) ||
		new Set([
			"/404",
			"/404.html",
			"/archive",
			"/archive.html",
			"/rss.xml",
			"/robots.txt",
			"/sitemap.xml",
			"/sitemap-0.xml",
			"/sitemap-index.xml",
			"/content-index.json",
			...reservedPaths.map((item) => comparablePath(item).toLowerCase()),
		]).has(key)
	);
}

export function inspectContentRoutes({
	routes,
	registry,
	reservedPaths = [],
	requireRegistry = true,
}: {
	routes: ManagedContentRoute[];
	registry: ContentRouteRegistry;
	reservedPaths?: string[];
	requireRegistry?: boolean;
}): { issues: RouteIssue[]; redirects: HistoryRedirect[] } {
	const issues: RouteIssue[] = [];
	const routesById = new Map<string, ManagedContentRoute>();
	const paths = new Map<
		string,
		{ ownerId: string; publicPath: string; sourcePath?: string }
	>();
	const outputs = new Map<string, { ownerId: string; publicPath: string }>();
	function claim(publicPath: string, ownerId: string, sourcePath?: string) {
		const detail = { path: sourcePath ?? publicPath, contentId: ownerId };
		const problem = routePathProblem(publicPath);
		if (problem) {
			issues.push({
				code: "invalid-path",
				severity: "error",
				message: `${publicPath}: ${problem}`,
				...detail,
			});
			return;
		}
		if (isReservedRoute(publicPath, reservedPaths))
			issues.push({
				code: "reserved-path",
				severity: "error",
				message: `${publicPath} 占用了站点保留入口。`,
				...detail,
			});
		if (/\.HTML\/?$/.test(publicPath))
			issues.push({
				code: "extension-case",
				severity: "warning",
				message: `${publicPath} 的 .HTML 按既有规则处理，与 .html 的输出不同。`,
				...detail,
			});
		const key = comparablePath(publicPath);
		const existing = paths.get(key);
		if (existing && existing.ownerId !== ownerId)
			issues.push({
				code: "path-owned",
				severity: "error",
				message: `${publicPath} 已永久归属 ${existing.ownerId}（${existing.sourcePath ?? existing.publicPath}）。`,
				ownerId: existing.ownerId,
				...detail,
			});
		else paths.set(key, { ownerId, publicPath, sourcePath });
		const outputKey = outputPathKey(publicPath);
		for (const [otherKey, other] of outputs) {
			if (
				(outputKey === otherKey &&
					(other.ownerId !== ownerId || other.publicPath !== publicPath)) ||
				outputKey.startsWith(`${otherKey}/`) ||
				otherKey.startsWith(`${outputKey}/`)
			)
				issues.push({
					code: "output-conflict",
					severity: "error",
					message: `${publicPath} 与 ${other.publicPath} 无法同时物化为静态文件（含大小写、编码和目录冲突）。`,
					ownerId: other.ownerId,
					...detail,
				});
		}
		outputs.set(outputKey, { ownerId, publicPath });
	}
	for (const [contentId, document] of Object.entries(registry.documents))
		for (const publicPath of document.paths) claim(publicPath, contentId);
	for (const route of routes) {
		if (route.contentId && !isContentId(route.contentId))
			issues.push({
				code: "invalid-id",
				severity: "error",
				message: `${route.sourcePath} 的 contentId 无效。`,
				path: route.sourcePath,
			});
		if (route.contentId) {
			const existing = routesById.get(route.contentId);
			if (existing)
				issues.push({
					code: "duplicate-id",
					severity: "error",
					message: `${route.sourcePath} 与 ${existing.sourcePath} 使用相同 contentId；复制为新文章时必须生成新 ID。`,
					contentId: route.contentId,
					path: route.sourcePath,
				});
			else routesById.set(route.contentId, route);
			if (
				requireRegistry &&
				!registry.documents[route.contentId]?.paths.includes(route.publicPath)
			)
				issues.push({
					code: "registry-outdated",
					severity: "error",
					message: `${route.sourcePath} 当前地址 ${route.publicPath} 尚未登记；请审阅后运行 node scripts/site/sync-content-routes.mjs --write 或在 Studio 确认保存。`,
					contentId: route.contentId,
					path: route.sourcePath,
				});
		}
		claim(
			route.publicPath,
			route.contentId ?? `legacy:${route.sourcePath}`,
			route.sourcePath,
		);
	}
	const redirects: HistoryRedirect[] = [];
	for (const [contentId, document] of Object.entries(registry.documents)) {
		const target = routesById.get(contentId);
		if (document.retired) {
			if (target)
				issues.push({
					code: "retired-identity",
					severity: "error",
					message: `${target.sourcePath} 仍登记为已回收，请在 Studio 恢复文章或审阅同步登记后构建。`,
					contentId,
					path: target.sourcePath,
				});
			continue;
		}
		if (!target) {
			issues.push({
				code: "missing-identity",
				severity: "error",
				message: `登记中的 ${contentId} 找不到源文章；请恢复源文件或原 contentId，保留历史登记。`,
				contentId,
			});
			continue;
		}
		const history = document.paths.filter(
			(publicPath) => publicPath !== target.publicPath,
		);
		if (target.published)
			for (const publicPath of history)
				redirects.push({
					contentId,
					publicPath,
					targetPath: target.publicPath,
					outputPath: materializePublicPath(publicPath).outputPath,
				});
	}
	return { issues, redirects };
}

export function appendRoutePaths(
	registry: ContentRouteRegistry,
	contentId: string,
	paths: string[],
): ContentRouteRegistry {
	return {
		version: 1,
		documents: Object.assign(Object.create(null), registry.documents, {
			[contentId]: {
				paths: [
					...new Set([
						...(registry.documents[contentId]?.paths ?? []),
						...paths,
					]),
				],
			},
		}),
	};
}

export function publicRoutePath(publicPath: string, base = "/"): string {
	return `${base.replace(/\/+$/, "")}${publicPath}` || "/";
}

export function renderHistoryRedirect(
	targetPath: string,
	canonicalUrl: string,
): string {
	const escapeHtml = (value: string) =>
		value
			.replaceAll("&", "&amp;")
			.replaceAll('"', "&quot;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;");
	const literal = JSON.stringify(targetPath).replaceAll("<", "\\u003c");
	return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${escapeHtml(targetPath)}"><link rel="canonical" href="${escapeHtml(canonicalUrl)}"><title>文章已迁移</title></head><body><p>文章已迁移至 <a href="${escapeHtml(targetPath)}">新地址</a>。</p><script>location.replace(${literal}+location.search+location.hash)</script></body></html>\n`;
}
