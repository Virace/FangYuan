import { LinkPresets } from "./constants/link-presets";
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
} from "./default-config";
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
	SiteConfig,
} from "./types/config";
import { normalizeCommentConfig } from "./utils/comments/options";
import { mergeNavBarLinks } from "./utils/navbar-links";

type ExternalSiteConfig = Omit<
	Partial<SiteConfig>,
	"themeColor" | "banner" | "toc" | "permalink"
> & {
	themeColor?: Partial<SiteConfig["themeColor"]>;
	banner?: Omit<Partial<SiteConfig["banner"]>, "credit"> & {
		credit?: Partial<SiteConfig["banner"]["credit"]>;
	};
	toc?: Partial<SiteConfig["toc"]>;
	permalink?: Partial<SiteConfig["permalink"]> & {
		postPatternRules?: SiteConfig["permalink"]["postPatternRules"];
	};
};

type ExternalNavBarConfig = {
	links?: NavBarConfig["links"];
};

type ExternalNavBarI18n = NavBarI18nConfig;

type ExternalProfileConfig = Omit<Partial<ProfileConfig>, "links"> & {
	links?: ProfileConfig["links"];
};

type ExternalSiteConfigModule = {
	siteConfig?: ExternalSiteConfig;
	navBarConfig?: ExternalNavBarConfig;
	navBarI18n?: ExternalNavBarI18n;
	profileConfig?: ExternalProfileConfig;
	footerConfig?: Partial<FooterConfig>;
	licenseConfig?: Partial<LicenseConfig>;
	expressiveCodeConfig?: Partial<ExpressiveCodeConfig>;
	commentConfig?: CommentConfig;
	pageMetricsConfig?: PageMetricsConfig;
	pageFeedbackConfig?: PageFeedbackConfig;
};

const externalSiteConfigModules = import.meta.glob<ExternalSiteConfigModule>(
	"../site/config.ts",
	{ eager: true },
);

const externalSiteConfig =
	(Object.values(externalSiteConfigModules)[0] as
		| ExternalSiteConfigModule
		| undefined) ?? null;

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
		links: override.links ?? defaultConfig.links,
	};
}

function mergeCommentConfig(
	defaultConfig: CommentConfig,
	override?: CommentConfig,
): CommentConfig {
	if (!override) {
		return normalizeCommentConfig(defaultConfig);
	}

	return normalizeCommentConfig({
		...defaultConfig,
		...override,
		qingyan: override.qingyan ?? defaultConfig.qingyan,
	});
}

function mergePageMetricsConfig(
	defaultConfig: PageMetricsConfig,
	override?: PageMetricsConfig,
): PageMetricsConfig {
	if (!override) {
		return defaultConfig;
	}

	return {
		...defaultConfig,
		...override,
		qingyan: override.qingyan ?? defaultConfig.qingyan,
	};
}

function mergePageFeedbackConfig(
	defaultConfig: PageFeedbackConfig,
	override?: PageFeedbackConfig,
): PageFeedbackConfig {
	if (!override) {
		return defaultConfig;
	}

	return {
		...defaultConfig,
		...override,
		qingyan: override.qingyan ?? defaultConfig.qingyan,
		rewardOptions: override.rewardOptions ?? defaultConfig.rewardOptions,
	};
}

export const siteConfig: SiteConfig = mergeSiteConfig(
	defaultSiteConfig,
	externalSiteConfig?.siteConfig,
);

export const navBarConfig: NavBarConfig = mergeNavBarConfig(
	defaultNavBarConfig,
	externalSiteConfig?.navBarConfig,
);

export const navBarI18n: NavBarI18nConfig = {
	...defaultNavBarI18n,
	...externalSiteConfig?.navBarI18n,
};

export const profileConfig: ProfileConfig = mergeProfileConfig(
	defaultProfileConfig,
	externalSiteConfig?.profileConfig,
);

export const footerConfig: FooterConfig = {
	...defaultFooterConfig,
	...externalSiteConfig?.footerConfig,
};

export const licenseConfig: LicenseConfig = {
	...defaultLicenseConfig,
	...externalSiteConfig?.licenseConfig,
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	...defaultExpressiveCodeConfig,
	...externalSiteConfig?.expressiveCodeConfig,
};

export const commentConfig: CommentConfig = mergeCommentConfig(
	defaultCommentConfig,
	externalSiteConfig?.commentConfig,
);

export const pageMetricsConfig: PageMetricsConfig = mergePageMetricsConfig(
	defaultPageMetricsConfig,
	externalSiteConfig?.pageMetricsConfig,
);

export const pageFeedbackConfig: PageFeedbackConfig = mergePageFeedbackConfig(
	defaultPageFeedbackConfig,
	externalSiteConfig?.pageFeedbackConfig,
);

export const configImageBaseRoots: Readonly<{
	banner: "site" | "src";
	avatar: "site" | "src";
}> = {
	banner: externalSiteConfig?.siteConfig?.banner?.src ? "site" : "src",
	avatar: externalSiteConfig?.profileConfig?.avatar ? "site" : "src",
};
