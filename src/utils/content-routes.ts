import type { PermalinkConfig, PostSortConfig } from "../types/config";
import { resolvePermalinkForEntry } from "./permalink.ts";
import { materializePublicPath } from "./permalink-materialization.ts";
import { attachAdjacentPostLinks, sortPostRoutes } from "./post-ordering.ts";

type BaseContentEntry<TData extends Record<string, unknown>> = {
	id: string;
	data: TData;
	filePath?: string;
	body?: string;
};

type TocFrontmatter = {
	enable?: boolean;
	depth?: 1 | 2 | 3;
};

type PostRouteData = {
	title: string;
	published: Date;
	updated?: Date;
	alias?: string;
	permalink?: string;
	toc?: TocFrontmatter;
	draft?: boolean;
	description?: string;
	image?: unknown;
	tags?: string[];
	category?: string | null;
	lang?: string;
	sticky?: number;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
	prevPermalink?: string;
	nextPermalink?: string;
	publicPath?: string;
};

type SpecRouteData = {
	alias?: string;
	permalink?: string;
	toc?: TocFrontmatter;
	published?: Date;
	updated?: Date;
	[key: string]: unknown;
};

export type PostContentEntry = BaseContentEntry<PostRouteData>;
export type SpecContentEntry = BaseContentEntry<SpecRouteData>;

type MaterializedRoute = ReturnType<typeof materializePublicPath>;

export type RoutedPostEntry = MaterializedRoute & {
	kind: "post";
	entryId: string;
	entry: PostContentEntry;
};

export type RoutedSpecEntry = MaterializedRoute & {
	kind: "spec";
	entryId: string;
	entry: SpecContentEntry;
};

export type RoutedContentEntry = RoutedPostEntry | RoutedSpecEntry;
export type DirectoryRoutedContentEntry = RoutedContentEntry & {
	buildFamily: "directory";
};
export type FileRoutedContentEntry = RoutedContentEntry & {
	buildFamily: "file";
};

export type ContentRouteManifest = {
	posts: RoutedPostEntry[];
	specPages: RoutedSpecEntry[];
	routes: RoutedContentEntry[];
	directoryRoutes: DirectoryRoutedContentEntry[];
	fileRoutes: FileRoutedContentEntry[];
	postByEntryId: Map<string, RoutedPostEntry>;
	specByEntryId: Map<string, RoutedSpecEntry>;
	byPublicPath: Map<string, RoutedContentEntry>;
};

export type RootPageRoute =
	| RoutedContentEntry
	| {
			kind: "pagination";
			page: unknown;
	  };

export function shouldExposePostEntry(entry: { data?: unknown }): boolean {
	if (
		typeof entry.data === "object" &&
		entry.data !== null &&
		"draft" in entry.data
	) {
		return (entry.data as { draft?: boolean }).draft !== true;
	}

	return true;
}

type UpdatedDateProviders = {
	gitProvider?: (filePath?: string) => Promise<Date | null>;
	filesystemProvider?: (filePath?: string) => Promise<Date | null>;
};

type AstroPaginatedPage = {
	currentPage: number;
};

function getFileStem(entryId: string): string {
	const normalizedId = entryId.replace(/\/+$/g, "");
	const segments = normalizedId.split("/");
	return segments.at(-1) ?? normalizedId;
}

function getRouteSegments(routeParam?: string): string[] {
	return routeParam ? routeParam.split("/").filter(Boolean) : [];
}

function ensureUniquePublicPath(
	byPublicPath: Map<string, RoutedContentEntry>,
	route: RoutedContentEntry,
): void {
	const existingRoute = byPublicPath.get(route.publicPath);
	if (existingRoute) {
		throw new Error(
			`Duplicate public path "${route.publicPath}" for ${existingRoute.kind}:${existingRoute.entryId} and ${route.kind}:${route.entryId}`,
		);
	}

	byPublicPath.set(route.publicPath, route);
}

function isDirectoryContentRoute(
	route: RoutedContentEntry,
): route is DirectoryRoutedContentEntry {
	return route.buildFamily === "directory";
}

function isFileContentRoute(
	route: RoutedContentEntry,
): route is FileRoutedContentEntry {
	return route.buildFamily === "file";
}

function normalizeComparablePublicPath(publicPath: string): string {
	if (publicPath === "/") {
		return "/";
	}

	return publicPath.replace(/\/+$/, "");
}

function assertRouteDoesNotOccupyReservedPath(route: RoutedContentEntry): void {
	const normalizedPublicPath = normalizeComparablePublicPath(route.publicPath);
	const occupiesHomeRoute = normalizedPublicPath === "/";
	const occupiesHomePagination = /^\/page\/\d+(?:\.html)?$/.test(
		normalizedPublicPath,
	);
	const occupiesBuiltInRoute = new Set([
		"/404",
		"/404.html",
		"/archive",
		"/archive.html",
	]).has(normalizedPublicPath);

	if (!occupiesHomeRoute && !occupiesHomePagination && !occupiesBuiltInRoute) {
		return;
	}

	throw new Error(
		`Reserved public path "${route.publicPath}" for ${route.kind}:${route.entryId}`,
	);
}

function buildPostRoute(
	entry: PostContentEntry,
	permalinkConfig: PermalinkConfig,
): RoutedPostEntry {
	const publicPath = resolvePermalinkForEntry({
		entryType: "post",
		entryId: entry.id,
		fileStem: getFileStem(entry.id),
		alias: entry.data.alias ?? "",
		permalink: entry.data.permalink ?? "",
		pattern: permalinkConfig.postsPattern,
		postPatternRules: permalinkConfig.postPatternRules,
		published: entry.data.published,
		aliasValidation: permalinkConfig.aliasValidation,
		trailingSlash: permalinkConfig.trailingSlash,
	});
	const materialized = materializePublicPath(publicPath);

	return {
		kind: "post",
		entryId: entry.id,
		...materialized,
		entry: {
			...entry,
			data: {
				...entry.data,
				publicPath: materialized.publicPath,
			},
		},
	};
}

function buildSpecRoute(
	entry: SpecContentEntry,
	permalinkConfig: PermalinkConfig,
): RoutedSpecEntry {
	const publicPath = resolvePermalinkForEntry({
		entryType: "spec",
		entryId: entry.id,
		fileStem: getFileStem(entry.id),
		alias: entry.data.alias ?? "",
		permalink: entry.data.permalink ?? "",
		pattern: permalinkConfig.pagesPattern,
		published: entry.data.published ?? new Date("1970-01-01T00:00:00.000Z"),
		aliasValidation: permalinkConfig.aliasValidation,
		trailingSlash: permalinkConfig.trailingSlash,
	});
	const materialized = materializePublicPath(publicPath);

	return {
		kind: "spec",
		entryId: entry.id,
		...materialized,
		entry: {
			...entry,
			data: {
				...entry.data,
				publicPath: materialized.publicPath,
			},
		},
	};
}

export function buildContentRouteManifest({
	posts,
	specPages,
	permalinkConfig,
}: {
	posts: PostContentEntry[];
	specPages: SpecContentEntry[];
	permalinkConfig: PermalinkConfig;
}): ContentRouteManifest {
	const byPublicPath = new Map<string, RoutedContentEntry>();
	const postRoutes = posts.map((entry) => {
		const route = buildPostRoute(entry, permalinkConfig);
		assertRouteDoesNotOccupyReservedPath(route);
		ensureUniquePublicPath(byPublicPath, route);
		return route;
	});
	const specRoutes = specPages.map((entry) => {
		const route = buildSpecRoute(entry, permalinkConfig);
		assertRouteDoesNotOccupyReservedPath(route);
		ensureUniquePublicPath(byPublicPath, route);
		return route;
	});
	const routes = [...postRoutes, ...specRoutes];
	const directoryRoutes = routes.filter(
		isDirectoryContentRoute,
	) as DirectoryRoutedContentEntry[];
	const fileRoutes = routes.filter(
		isFileContentRoute,
	) as FileRoutedContentEntry[];

	return {
		posts: postRoutes,
		specPages: specRoutes,
		routes,
		directoryRoutes,
		fileRoutes,
		postByEntryId: new Map(postRoutes.map((route) => [route.entryId, route])),
		specByEntryId: new Map(specRoutes.map((route) => [route.entryId, route])),
		byPublicPath,
	};
}

export function requireSpecRoute(
	manifest: Pick<ContentRouteManifest, "specByEntryId">,
	entryId: string,
	errorMessage: string,
): RoutedSpecEntry {
	const route = manifest.specByEntryId.get(entryId);
	if (!route) {
		throw new Error(errorMessage);
	}

	return route;
}

export function findContentRouteBySegments(
	routes: Pick<RoutedContentEntry, "routeParam">[],
	segments: string[],
): RoutedContentEntry | null {
	const targetRouteParam = segments.filter(Boolean).join("/");
	return (
		(routes.find((route) => (route.routeParam ?? "") === targetRouteParam) as
			| RoutedContentEntry
			| undefined) ?? null
	);
}

export async function applyEffectiveUpdatedDates(
	manifest: ContentRouteManifest,
	settings: Pick<PermalinkConfig, "updatedDateMode" | "updatedDateFallback"> & {
		postSort: PostSortConfig;
	},
	providers: UpdatedDateProviders = {},
): Promise<ContentRouteManifest> {
	const { resolveUpdatedDate } = await import("./updated-date.ts");
	const nextPosts = await Promise.all(
		manifest.posts.map(async (route) => {
			const effectiveUpdated = await resolveUpdatedDate({
				mode: settings.updatedDateMode,
				fallback: settings.updatedDateFallback,
				frontmatterUpdated: route.entry.data.updated,
				filePath: route.entry.filePath,
				gitProvider: providers.gitProvider,
				filesystemProvider: providers.filesystemProvider,
			});

			return {
				...route,
				entry: {
					...route.entry,
					data: {
						...route.entry.data,
						updated: effectiveUpdated ?? route.entry.data.updated,
					},
				},
			};
		}),
	);
	const nextSpecPages = await Promise.all(
		manifest.specPages.map(async (route) => {
			const effectiveUpdated = await resolveUpdatedDate({
				mode: settings.updatedDateMode,
				fallback: settings.updatedDateFallback,
				frontmatterUpdated: route.entry.data.updated,
				filePath: route.entry.filePath,
				gitProvider: providers.gitProvider,
				filesystemProvider: providers.filesystemProvider,
			});

			return {
				...route,
				entry: {
					...route.entry,
					data: {
						...route.entry.data,
						updated: effectiveUpdated ?? route.entry.data.updated,
					},
				},
			};
		}),
	);
	const orderedPosts = attachAdjacentPostLinks(
		sortPostRoutes(nextPosts, settings.postSort),
	);
	const routes = [...orderedPosts, ...nextSpecPages];
	const directoryRoutes = routes.filter(
		isDirectoryContentRoute,
	) as DirectoryRoutedContentEntry[];
	const fileRoutes = routes.filter(
		isFileContentRoute,
	) as FileRoutedContentEntry[];

	return {
		posts: orderedPosts,
		specPages: nextSpecPages,
		routes,
		directoryRoutes,
		fileRoutes,
		postByEntryId: new Map(orderedPosts.map((route) => [route.entryId, route])),
		specByEntryId: new Map(
			nextSpecPages.map((route) => [route.entryId, route]),
		),
		byPublicPath: new Map(routes.map((route) => [route.publicPath, route])),
	};
}

let cachedManifestPromise: Promise<ContentRouteManifest> | null = null;

export async function getContentRouteManifest(): Promise<ContentRouteManifest> {
	if (!cachedManifestPromise) {
		cachedManifestPromise = (async () => {
			const [{ getCollection }, { siteConfig }] = await Promise.all([
				import("astro:content"),
				import("../config"),
			]);
			const posts = (await getCollection("posts", (entry) => {
				return shouldExposePostEntry(entry);
			})) as PostContentEntry[];
			const specPages = (await getCollection("spec")) as SpecContentEntry[];
			const manifest = buildContentRouteManifest({
				posts,
				specPages,
				permalinkConfig: siteConfig.permalink,
			});

			requireSpecRoute(manifest, "about", "About page content not found");
			return applyEffectiveUpdatedDates(manifest, {
				...siteConfig.permalink,
				postSort: siteConfig.postSort,
			});
		})();
	}

	return cachedManifestPromise;
}

export async function getPostRouteManifest(): Promise<{
	entries: RoutedPostEntry[];
	byEntryId: Map<string, RoutedPostEntry>;
}> {
	const manifest = await getContentRouteManifest();
	return {
		entries: manifest.posts,
		byEntryId: manifest.postByEntryId,
	};
}

export async function getFileContentRouteManifest(): Promise<{
	entries: FileRoutedContentEntry[];
}> {
	const manifest = await getContentRouteManifest();
	return {
		entries: manifest.fileRoutes,
	};
}

export async function buildRootPageStaticPaths({
	paginate,
}: {
	paginate: (
		data: unknown[],
		options?: {
			pageSize?: number;
			params?: Record<string, string | undefined>;
			props?: Record<string, unknown>;
		},
	) => Array<{
		params: Record<string, string | undefined>;
		props: {
			page: unknown;
		};
	}>;
}): Promise<
	Array<{
		params: Record<string, string | undefined>;
		props: {
			route: RootPageRoute;
		};
	}>
> {
	const [manifest, { getPostsPerPage }] = await Promise.all([
		getContentRouteManifest(),
		import("./pagination-utils"),
	]);
	const paginationPaths = paginate(
		manifest.posts.map((route) => route.entry),
		{
			pageSize: getPostsPerPage(),
		},
	);
	const rootPaginationPath = paginationPaths
		.map((pathItem) => ({
			...pathItem,
			props: {
				route: {
					kind: "pagination" as const,
					page: pathItem.props.page,
				},
			},
		}))
		.find(
			(pathItem) =>
				(pathItem.props.route.page as AstroPaginatedPage).currentPage === 1,
		);
	const contentPaths = manifest.directoryRoutes.map((route) => ({
		params: {
			page: route.routeParam,
		},
		props: {
			route,
		},
	}));

	return rootPaginationPath
		? [rootPaginationPath, ...contentPaths]
		: contentPaths;
}

export async function buildHomePaginationStaticPaths({
	paginate,
}: {
	paginate: (
		data: unknown[],
		options?: {
			pageSize?: number;
			params?: Record<string, string | undefined>;
			props?: Record<string, unknown>;
		},
	) => Array<{
		params: Record<string, string | undefined>;
		props: {
			page: unknown;
		};
	}>;
}): Promise<
	Array<{
		params: Record<string, string | undefined>;
		props: {
			page: unknown;
		};
	}>
> {
	const [manifest, { getPostsPerPage }] = await Promise.all([
		getContentRouteManifest(),
		import("./pagination-utils"),
	]);

	return paginate(
		manifest.posts.map((route) => route.entry),
		{
			pageSize: getPostsPerPage(),
		},
	).filter(
		(pathItem) => (pathItem.props.page as AstroPaginatedPage).currentPage > 1,
	);
}

export async function buildFileContentStaticPaths(): Promise<
	Array<{
		params: Record<string, string | undefined>;
		props: {
			route: FileRoutedContentEntry;
		};
	}>
> {
	const manifest = await getContentRouteManifest();

	return manifest.fileRoutes.map((route) => ({
		params: {
			page: route.routeParam,
		},
		props: {
			route,
		},
	}));
}

export function getRouteSegmentsForEntry(
	route: Pick<RoutedContentEntry, "routeParam">,
): string[] {
	return getRouteSegments(route.routeParam);
}
