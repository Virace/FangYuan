import {
	defaultCommentConfig,
	defaultExpressiveCodeConfig,
	defaultFooterConfig,
	defaultLicenseConfig,
	defaultNavBarConfig,
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
	PageFeedbackConfig,
	PageMetricsConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { normalizeCommentConfig } from "./utils/comments/options";

type ExternalSiteConfig = Omit<
	Partial<SiteConfig>,
	"themeColor" | "banner" | "toc"
> & {
	themeColor?: Partial<SiteConfig["themeColor"]>;
	banner?: Omit<Partial<SiteConfig["banner"]>, "credit"> & {
		credit?: Partial<SiteConfig["banner"]["credit"]>;
	};
	toc?: Partial<SiteConfig["toc"]>;
};

type ExternalNavBarConfig = {
	links?: NavBarConfig["links"];
};

type ExternalProfileConfig = Omit<Partial<ProfileConfig>, "links"> & {
	links?: ProfileConfig["links"];
};

type ExternalSiteConfigModule = {
	siteConfig?: ExternalSiteConfig;
	navBarConfig?: ExternalNavBarConfig;
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
		links: override.links ?? defaultConfig.links,
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
		provider: override.provider ?? defaultConfig.provider,
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
		provider: override.provider ?? defaultConfig.provider,
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
		provider: override.provider ?? defaultConfig.provider,
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

export const configImageBaseRoots = {
	banner: externalSiteConfig?.siteConfig?.banner?.src ? "site" : "src",
	avatar: externalSiteConfig?.profileConfig?.avatar ? "site" : "src",
} as const;
