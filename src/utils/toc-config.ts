export type TocFrontmatterOverride = {
	enable?: boolean;
	depth?: 1 | 2 | 3;
};

export type ResolvedTocConfig = {
	enable: boolean;
	depth: 1 | 2 | 3;
};

export type TocPageKind = "post" | "spec" | "builtin";

function getPageKindDefaultEnable(pageKind: TocPageKind): boolean {
	if (pageKind === "post") {
		return true;
	}

	return false;
}

export function resolveTocConfig({
	pageKind,
	siteToc,
	headingsCount,
	frontmatterToc,
}: {
	pageKind: TocPageKind;
	siteToc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};
	headingsCount: number;
	frontmatterToc?: TocFrontmatterOverride;
}): ResolvedTocConfig {
	const resolvedDepth = frontmatterToc?.depth ?? siteToc.depth;

	if (!siteToc.enable) {
		return {
			enable: false,
			depth: resolvedDepth,
		};
	}

	const resolvedEnable =
		(frontmatterToc?.enable ?? getPageKindDefaultEnable(pageKind)) &&
		headingsCount > 0;

	return {
		enable: resolvedEnable,
		depth: resolvedDepth,
	};
}
