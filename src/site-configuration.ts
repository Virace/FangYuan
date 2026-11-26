import { LinkPresets } from "./constants/link-presets.ts";
import {
	defaultCommentConfig,
	defaultExpressiveCodeConfig,
	defaultFooterConfig,
	defaultLicenseConfig,
	defaultNavBarConfig,
	defaultNavBarI18n,
	defaultPageFeedbackConfig,
	defaultPageMetricsConfig,
	defaultProfileConfig,
	defaultSiteConfig,
} from "./default-config.ts";
import type {
	CommentConfig,
	ExpressiveCodeConfig,
	FooterConfig,
	LicenseConfig,
	NavBarConfig,
	NavBarI18nConfig,
	PageFeedbackConfig,
	PageMetricsConfig,
	ProfileConfig,
	QingYanClientConfig,
	SiteConfig,
} from "./types/config";
import { normalizeCommentConfig } from "./utils/comments/options.ts";
import { mergeNavBarLinks } from "./utils/navbar-links.ts";
import {
	applyPublicQingYanCommentConfig,
	applyPublicQingYanPageFeedbackConfig,
	applyPublicQingYanPageMetricsConfig,
} from "./utils/site-source/demo-qingyan-env.ts";
import type { ExternalSiteConfigYaml } from "./utils/site-source/external-config";
import {
	normalizeConfiguredBase,
	normalizeConfiguredSite,
} from "./utils/site-source/runtime-config.ts";

type ExternalSiteConfig = ExternalSiteConfigYaml["siteConfig"];
type ExternalNavBarConfig = ExternalSiteConfigYaml["navBarConfig"];
type ExternalProfileConfig = ExternalSiteConfigYaml["profileConfig"];
type ExternalPageFeedbackConfig = ExternalSiteConfigYaml["pageFeedbackConfig"];
function mergeSiteConfig(
	defaultConfig: SiteConfig,
	override?: ExternalSiteConfig,
): SiteConfig {
	if (!override) {
		return defaultConfig;
	}

	return {
		...defaultConfig,
		...override,
		site: normalizeConfiguredSite(override.site ?? defaultConfig.site),
		base: normalizeConfiguredBase(override.base ?? defaultConfig.base),
		themeColor: {
			...defaultConfig.themeColor,
			...override.themeColor,
		},
		banner: {
			...defaultConfig.banner,
			...override.banner,
			credit: {
				...defaultConfig.banner.credit,
				...override.banner?.credit,
			},
		},
		toc: {
			...defaultConfig.toc,
			...override.toc,
		},
		githubCard: {
			...defaultConfig.githubCard,
			...override.githubCard,
		},
		notifications: {
			...defaultConfig.notifications,
			...override.notifications,
		},
		tags: {
			...defaultConfig.tags,
			...override.tags,
		},
		postSort: {
			...defaultConfig.postSort,
			...override.postSort,
		},
		taxonomySort: {
			categories: {
				...defaultConfig.taxonomySort.categories,
				...override.taxonomySort?.categories,
			},
			tags: {
				...defaultConfig.taxonomySort.tags,
				...override.taxonomySort?.tags,
			},
		},
		logo: override.logo === undefined ? defaultConfig.logo : override.logo,
		favicon: override.favicon ?? defaultConfig.favicon,
		permalink: {
			...defaultConfig.permalink,
			...override.permalink,
			postPatternRules:
				override.permalink?.postPatternRules ??
				defaultConfig.permalink.postPatternRules,
		},
	};
}

function mergeNavBarConfig(
	defaultConfig: NavBarConfig,
	override?: ExternalNavBarConfig,
): NavBarConfig {
	if (!override) {
		return defaultConfig;
	}

	return {
		...defaultConfig,
		...override,
		links: mergeNavBarLinks(defaultConfig.links, override.links, [
			LinkPresets.About,
		]),
	};
}

function mergeProfileConfig(
	defaultConfig: ProfileConfig,
	override?: ExternalProfileConfig,
): ProfileConfig {
	if (!override) {
		return defaultConfig;
	}

	return {
		...defaultConfig,
		...override,
		linkEffect: override.linkEffect ?? defaultConfig.linkEffect,
		links: override.links ?? defaultConfig.links,
	};
}

function mergeCommentConfig(
	defaultConfig: CommentConfig,
	override?: Partial<CommentConfig>,
): CommentConfig {
	if (!override) {
		return normalizeCommentConfig(defaultConfig);
	}

	return normalizeCommentConfig({
		...defaultConfig,
		...override,
	});
}

function mergePageMetricsConfig(
	defaultConfig: PageMetricsConfig,
	override?: Partial<PageMetricsConfig>,
): PageMetricsConfig {
	if (!override) {
		return defaultConfig;
	}

	return {
		...defaultConfig,
		...override,
	};
}

function mergePageFeedbackConfig(
	defaultConfig: PageFeedbackConfig,
	override?: ExternalPageFeedbackConfig,
): PageFeedbackConfig {
	if (!override) {
		return defaultConfig;
	}

	return {
		...defaultConfig,
		...override,
		like: {
			...defaultConfig.like,
			...override.like,
		},
		reward: {
			...defaultConfig.reward,
			...override.reward,
			options: override.reward?.options ?? defaultConfig.reward.options,
		},
	};
}

export interface SiteConfiguration {
	siteConfig: SiteConfig;
	navBarConfig: NavBarConfig;
	navBarI18n: NavBarI18nConfig;
	profileConfig: ProfileConfig;
	footerConfig: FooterConfig;
	licenseConfig: LicenseConfig;
	expressiveCodeConfig: ExpressiveCodeConfig;
	qingyanConfig: QingYanClientConfig | null;
	commentConfig: CommentConfig;
	pageMetricsConfig: PageMetricsConfig;
	pageFeedbackConfig: PageFeedbackConfig;
	qingyanDevProxyTarget: string | null;
}

export function resolveSiteConfiguration(
	externalSiteConfig: ExternalSiteConfigYaml | null = null,
	publicSiteConfigOverride: Partial<SiteConfig> | null = null,
	publicQingYanConfig: QingYanClientConfig | null = null,
): SiteConfiguration {
	return {
		siteConfig: mergeSiteConfig(defaultSiteConfig, {
			...externalSiteConfig?.siteConfig,
			...publicSiteConfigOverride,
		}),
		navBarConfig: mergeNavBarConfig(
			defaultNavBarConfig,
			externalSiteConfig?.navBarConfig,
		),
		navBarI18n: { ...defaultNavBarI18n, ...externalSiteConfig?.navBarI18n },
		profileConfig: mergeProfileConfig(
			defaultProfileConfig,
			externalSiteConfig?.profileConfig,
		),
		footerConfig: {
			...defaultFooterConfig,
			...externalSiteConfig?.footerConfig,
		},
		licenseConfig: {
			...defaultLicenseConfig,
			...externalSiteConfig?.licenseConfig,
		},
		expressiveCodeConfig: {
			...defaultExpressiveCodeConfig,
			...externalSiteConfig?.expressiveCodeConfig,
		},
		qingyanConfig:
			publicQingYanConfig ?? externalSiteConfig?.qingyanConfig ?? null,
		commentConfig: applyPublicQingYanCommentConfig(
			mergeCommentConfig(
				defaultCommentConfig,
				externalSiteConfig?.commentConfig,
			),
			publicQingYanConfig,
		),
		pageMetricsConfig: applyPublicQingYanPageMetricsConfig(
			mergePageMetricsConfig(
				defaultPageMetricsConfig,
				externalSiteConfig?.pageMetricsConfig,
			),
			publicQingYanConfig,
		),
		pageFeedbackConfig: applyPublicQingYanPageFeedbackConfig(
			mergePageFeedbackConfig(
				defaultPageFeedbackConfig,
				externalSiteConfig?.pageFeedbackConfig,
			),
			publicQingYanConfig,
		),
		qingyanDevProxyTarget: externalSiteConfig?.qingyanDevProxyTarget ?? null,
	};
}
