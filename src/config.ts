import {
	resolveSiteConfiguration,
	type SiteConfiguration,
} from "./site-configuration.ts";
import type { QingYanClientConfig } from "./types/config";
import type { ExternalSiteConfigYaml } from "./utils/site-source/external-config";
import { resolvePublicSiteConfigOverride } from "./utils/site-source/public-deploy-env";

let externalSiteConfig: ExternalSiteConfigYaml | null = null;
let publicQingYanConfig: QingYanClientConfig | null = null;

if (import.meta.env.SSR) {
	const [
		{ loadExternalSiteConfigYaml },
		{ resolveSiteSourceContext },
		{ resolvePublicQingYanConfig },
	] = await Promise.all([
		import("./utils/site-source/external-config.ts"),
		import("./utils/site-source/context.ts"),
		import("./utils/site-source/demo-qingyan-env.ts"),
	]);
	const siteSourceContext = resolveSiteSourceContext();

	externalSiteConfig =
		siteSourceContext.useExternalConfig &&
		siteSourceContext.externalConfigPath !== null
			? loadExternalSiteConfigYaml(siteSourceContext.externalConfigPath)
			: null;
	publicQingYanConfig = resolvePublicQingYanConfig(import.meta.env, {
		allowDemoQingYan:
			import.meta.env.PUBLIC_FANGYUAN_ALLOW_DEMO_QINGYAN === "true",
	});
}
const publicSiteConfigOverride = resolvePublicSiteConfigOverride(
	import.meta.env,
);

const config = resolveSiteConfiguration(
	externalSiteConfig,
	publicSiteConfigOverride,
	publicQingYanConfig,
);

export const siteConfig: SiteConfiguration["siteConfig"] = config.siteConfig;
export const navBarConfig: SiteConfiguration["navBarConfig"] =
	config.navBarConfig;
export const navBarI18n: SiteConfiguration["navBarI18n"] = config.navBarI18n;
export const profileConfig: SiteConfiguration["profileConfig"] =
	config.profileConfig;
export const footerConfig: SiteConfiguration["footerConfig"] =
	config.footerConfig;
export const licenseConfig: SiteConfiguration["licenseConfig"] =
	config.licenseConfig;
export const expressiveCodeConfig: SiteConfiguration["expressiveCodeConfig"] =
	config.expressiveCodeConfig;
export const qingyanConfig: SiteConfiguration["qingyanConfig"] =
	config.qingyanConfig;
export const commentConfig: SiteConfiguration["commentConfig"] =
	config.commentConfig;
export const pageMetricsConfig: SiteConfiguration["pageMetricsConfig"] =
	config.pageMetricsConfig;
export const pageFeedbackConfig: SiteConfiguration["pageFeedbackConfig"] =
	config.pageFeedbackConfig;

export const configImageBaseRoots: Readonly<{
	banner: "site" | "src";
	lensInsert: "site" | "src";
	logo: "site" | "src";
	avatar: "site" | "src";
	favicon: "site" | "src";
	reward: "site" | "src";
}> = {
	banner: externalSiteConfig?.siteConfig?.banner?.src ? "site" : "src",
	lensInsert: externalSiteConfig?.siteConfig?.banner?.optics?.insert
		? "site"
		: "src",
	logo: externalSiteConfig?.siteConfig?.logo ? "site" : "src",
	avatar: externalSiteConfig?.profileConfig?.avatar ? "site" : "src",
	favicon: externalSiteConfig?.siteConfig?.favicon ? "site" : "src",
	reward: externalSiteConfig?.pageFeedbackConfig?.reward?.options
		? "site"
		: "src",
};
