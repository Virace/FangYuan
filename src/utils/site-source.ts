import type {
	AliasValidationMode,
	TrailingSlashStrategy,
	UpdatedDateFallback,
	UpdatedDateMode,
} from "../types/config";
import {
	type ExternalSiteConfigYaml,
	loadExternalSiteConfigYaml,
} from "./external-site-config.ts";
import {
	normalizeConfiguredBase,
	normalizeConfiguredSite,
} from "./site-runtime-config.ts";
import { resolveSiteSourceContext } from "./site-source-context.ts";

type ContentRoot = "./src/content" | string;

export type ExternalPermalinkConfig = {
	postsPattern?: string | null;
	pagesPattern?: string | null;
	trailingSlash?: TrailingSlashStrategy | null;
	aliasValidation?: AliasValidationMode | null;
	updatedDateMode?: UpdatedDateMode | null;
	updatedDateFallback?: UpdatedDateFallback | null;
	postPatternRulePatterns: string[];
};

export type ExternalAstroSiteConfig = {
	site: string | null;
	base: string;
};

function loadResolvedExternalSiteConfig(): ExternalSiteConfigYaml | null {
	const siteSourceContext = resolveSiteSourceContext();
	if (
		!siteSourceContext.useExternalConfig ||
		siteSourceContext.externalConfigPath === null
	) {
		return null;
	}

	return loadExternalSiteConfigYaml(siteSourceContext.externalConfigPath);
}

export function resolveContentRoot(): ContentRoot {
	return resolveSiteSourceContext().contentRoot;
}

export function extractExternalPermalinkConfig(
	config: ExternalSiteConfigYaml | null,
): ExternalPermalinkConfig | null {
	const permalink = config?.siteConfig?.permalink;
	if (!permalink) {
		return null;
	}

	return {
		postsPattern: permalink.postsPattern ?? null,
		pagesPattern: permalink.pagesPattern ?? null,
		trailingSlash: (permalink.trailingSlash ??
			null) as TrailingSlashStrategy | null,
		aliasValidation: (permalink.aliasValidation ??
			null) as AliasValidationMode | null,
		updatedDateMode: (permalink.updatedDateMode ??
			null) as UpdatedDateMode | null,
		updatedDateFallback: (permalink.updatedDateFallback ??
			null) as UpdatedDateFallback | null,
		postPatternRulePatterns:
			permalink.postPatternRules?.map((rule) => rule.pattern) ?? [],
	};
}

export function extractExternalAstroSiteConfig(
	config: ExternalSiteConfigYaml | null,
): ExternalAstroSiteConfig | null {
	const siteConfig = config?.siteConfig;
	if (!siteConfig) {
		return null;
	}

	return {
		site: normalizeConfiguredSite(siteConfig.site),
		base: normalizeConfiguredBase(siteConfig.base),
	};
}

export function loadExternalPermalinkConfig(): ExternalPermalinkConfig | null {
	return extractExternalPermalinkConfig(loadResolvedExternalSiteConfig());
}

export function loadExternalAstroSiteConfig(): ExternalAstroSiteConfig | null {
	return extractExternalAstroSiteConfig(loadResolvedExternalSiteConfig());
}

export function loadExternalExpressiveCodeConfig(): { theme?: string } | null {
	return loadResolvedExternalSiteConfig()?.expressiveCodeConfig ?? null;
}

export function loadExternalQingYanDevProxyTarget(): string | null {
	return loadResolvedExternalSiteConfig()?.qingyanDevProxyTarget ?? null;
}
