export function normalizeConfiguredSite(
	site: string | null | undefined,
): string | null {
	const normalized = site?.trim();
	if (!normalized) {
		return null;
	}

	const resolved = new URL(normalized);
	if (resolved.pathname !== "/" || resolved.search || resolved.hash) {
		throw new Error(
			`siteConfig.site must be an origin-only URL. Move path information into siteConfig.base instead: ${normalized}`,
		);
	}

	return resolved.origin;
}

export function normalizeConfiguredBase(base: string | null | undefined): string {
	const normalized = base?.trim();
	if (!normalized || normalized === "/") {
		return "/";
	}

	if (
		normalized.includes("://") ||
		normalized.includes("?") ||
		normalized.includes("#")
	) {
		throw new Error(
			`siteConfig.base must be a path prefix like "/blog/": ${normalized}`,
		);
	}

	const collapsed = normalized.replace(/\\/g, "/").replace(/\/+/g, "/");
	const trimmed = collapsed.replace(/^\/|\/$/g, "");
	return trimmed ? `/${trimmed}/` : "/";
}
