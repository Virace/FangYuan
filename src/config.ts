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
import type { ExternalSiteConfigYaml } from "./utils/external-site-config";
import { mergeNavBarLinks } from "./utils/navbar-links";
import {
	applyPublicQingYanCommentConfig,
	applyPublicQingYanPageFeedbackConfig,
	applyPublicQingYanPageMetricsConfig,
	resolvePublicQingYanConfig,
	resolvePublicSiteConfigOverride,
} from "./utils/public-deploy-env-config";
import {
	normalizeConfiguredBase,
	normalizeConfiguredSite,
} from "./utils/site-runtime-config";

type ExternalSiteConfig = ExternalSiteConfigYaml["siteConfig"];
type ExternalNavBarConfig = ExternalSiteConfigYaml["navBarConfig"];
type ExternalProfileConfig = ExternalSiteConfigYaml["profileConfig"];
type ExternalPageFeedbackConfig = ExternalSiteConfigYaml["pageFeedbackConfig"];
let externalSiteConfig: ExternalSiteConfigYaml | null = null;

if (import.meta.env.SSR) {
	const [{ loadExternalSiteConfigYaml }, { resolveSiteSourceContext }] =
		await Promise.all([
			import("./utils/external-site-config.ts"),
			import("./utils/site-source-context.ts"),
		]);
	const siteSourceContext = resolveSiteSourceContext();

	externalSiteConfig =
		siteSourceContext.useExternalConfig &&
		siteSourceContext.externalConfigPath !== null
			? loadExternalSiteConfigYaml(siteSourceContext.externalConfigPath)
			: null;
}
const publicSiteConfigOverride = resolvePublicSiteConfigOverride(
	import.meta.env,
);
const publicQingYanConfig = resolvePublicQingYanConfig(import.meta.env);

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
		postSort: {
			...defaultConfig.postSort,
			...override.postSort,
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
	override?: Partial<CommentConfig>,
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
	override?: Partial<PageMetricsConfig>,
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
	override?: ExternalPageFeedbackConfig,
): PageFeedbackConfig {
	if (!override) {
		return defaultConfig;
	}

	return {
		...defaultConfig,
		...override,
		qingyan: override.qingyan ?? defaultConfig.qingyan,
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

export const siteConfig: SiteConfig = mergeSiteConfig(defaultSiteConfig, {
	...externalSiteConfig?.siteConfig,
	...publicSiteConfigOverride,
});

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

export const commentConfig: CommentConfig = applyPublicQingYanCommentConfig(
	mergeCommentConfig(defaultCommentConfig, externalSiteConfig?.commentConfig),
	publicQingYanConfig,
);

export const pageMetricsConfig: PageMetricsConfig =
	applyPublicQingYanPageMetricsConfig(
		mergePageMetricsConfig(
			defaultPageMetricsConfig,
			externalSiteConfig?.pageMetricsConfig,
		),
		publicQingYanConfig,
	);

export const pageFeedbackConfig: PageFeedbackConfig =
	applyPublicQingYanPageFeedbackConfig(
		mergePageFeedbackConfig(
			defaultPageFeedbackConfig,
			externalSiteConfig?.pageFeedbackConfig,
		),
		publicQingYanConfig,
	);

export const configImageBaseRoots: Readonly<{
	banner: "site" | "src";
	avatar: "site" | "src";
}> = {
	banner: externalSiteConfig?.siteConfig?.banner?.src ? "site" : "src",
	avatar: externalSiteConfig?.profileConfig?.avatar ? "site" : "src",
};
