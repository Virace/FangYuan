import type { TrailingSlashStrategy } from "../types/config";

export type BuildFacingPermalinkConfig = {
	postsPattern?: string | null;
	pagesPattern?: string | null;
	trailingSlash?: TrailingSlashStrategy | null;
	postPatternRulePatterns?: string[] | null;
};

function normalizePublicPath(value: string): string {
	const trimmedValue = value.trim();
	if (trimmedValue === "") {
		return "/";
	}

	const ensuredLeadingSlash = trimmedValue.startsWith("/")
		? trimmedValue
		: `/${trimmedValue}`;

	return ensuredLeadingSlash.replace(/\/{2,}/g, "/");
}

function renderPatternShape(pattern: string): string {
	return normalizePublicPath(
		pattern
			.replaceAll("%slug%", "slug")
			.replaceAll("%postname%", "slug")
			.replaceAll("%path%", "nested/path")
			.replaceAll("%year%", "2026")
			.replaceAll("%month%", "04")
			.replaceAll("%monthnum%", "04")
			.replaceAll("%day%", "21")
			.replaceAll("%id%", "entry-id")
			.replaceAll("%type%", "posts"),
	);
}

export function applyTrailingSlash(
	inputPath: string,
	strategy: TrailingSlashStrategy,
): string {
	const normalized = normalizePublicPath(inputPath);
	const withoutTrailingSlash =
		normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;

	if (strategy === "always") {
		return withoutTrailingSlash === "/" ? "/" : `${withoutTrailingSlash}/`;
	}

	if (strategy === "never") {
		return withoutTrailingSlash;
	}

	if (withoutTrailingSlash === "/" || withoutTrailingSlash.endsWith(".html")) {
		return withoutTrailingSlash;
	}

	return `${withoutTrailingSlash}/`;
}

export function materializePublicPath(publicPath: string): {
	publicPath: string;
	routeParam: string | undefined;
	buildFamily: "directory" | "file";
	outputPath: string;
} {
	const normalized = normalizePublicPath(publicPath);

	if (normalized === "/") {
		return {
			publicPath: "/",
			routeParam: undefined,
			buildFamily: "directory",
			outputPath: "index.html",
		};
	}

	if (normalized.endsWith("/")) {
		const routeParam =
			normalized.replace(/^\/+/, "").replace(/\/+$/, "") || undefined;
		return {
			publicPath: normalized,
			routeParam,
			buildFamily: "directory",
			outputPath: routeParam ? `${routeParam}/index.html` : "index.html",
		};
	}

	const routeSource = normalized.replace(/^\/+/, "");
	if (routeSource.endsWith(".html")) {
		return {
			publicPath: normalized,
			routeParam: routeSource.slice(0, -".html".length) || undefined,
			buildFamily: "file",
			outputPath: routeSource,
		};
	}

	return {
		publicPath: normalized,
		routeParam: routeSource || undefined,
		buildFamily: "file",
		outputPath: `${routeSource}.html`,
	};
}

export function getPaginationPublicPath(
	pageNumber: number,
	buildFormat: "directory" | "file",
): string {
	if (pageNumber <= 1) {
		return "/";
	}

	return buildFormat === "file" ? `/${pageNumber}.html` : `/${pageNumber}/`;
}

export function getStandaloneRoutePublicPath(
	routeStem: string,
	buildFormat: "directory" | "file",
): string {
	const normalizedStem = routeStem.trim().replace(/^\/+|\/+$/g, "");
	if (!normalizedStem) {
		return "/";
	}

	return buildFormat === "file"
		? `/${normalizedStem}.html`
		: `/${normalizedStem}/`;
}

export function resolveAstroBuildConfig(
	config?: BuildFacingPermalinkConfig | null,
): {
	buildFormat: "directory" | "file" | "preserve";
	trailingSlash: "always" | "never" | "ignore";
} {
	const patterns = [
		config?.postsPattern,
		config?.pagesPattern,
		...(config?.postPatternRulePatterns ?? []),
	].filter((value): value is string => Boolean(value?.trim()));

	if (patterns.length === 0) {
		return {
			buildFormat: "directory",
			trailingSlash: "always",
		};
	}

	const trailingSlash = config?.trailingSlash ?? "auto";
	const materializationFamilies = new Set(
		patterns.map((pattern) => {
			const publicPath = applyTrailingSlash(
				renderPatternShape(pattern),
				trailingSlash,
			);
			return materializePublicPath(publicPath).buildFamily;
		}),
	);

	if (materializationFamilies.size > 1) {
		return {
			buildFormat: "preserve",
			trailingSlash: "ignore",
		};
	}

	const [buildFamily = "directory"] = materializationFamilies;
	return {
		buildFormat: buildFamily,
		trailingSlash: buildFamily === "directory" ? "always" : "never",
	};
}
