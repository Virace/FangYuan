import fs from "node:fs";
import { z } from "astro/zod";
import { parse } from "yaml";
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
} from "../../types/config";

export type ExternalSiteConfigYaml = {
	fangyuanConfigVersion?: number;
	siteConfig?: Omit<
		Partial<SiteConfig>,
		"themeColor" | "banner" | "toc" | "permalink" | "postSort" | "taxonomySort"
	> & {
		themeColor?: Partial<SiteConfig["themeColor"]>;
		banner?: Omit<Partial<SiteConfig["banner"]>, "credit"> & {
			credit?: Partial<SiteConfig["banner"]["credit"]>;
		};
		toc?: Partial<SiteConfig["toc"]>;
		permalink?: Partial<SiteConfig["permalink"]> & {
			postPatternRules?: SiteConfig["permalink"]["postPatternRules"];
		};
		postSort?: Partial<SiteConfig["postSort"]>;
		taxonomySort?: {
			categories?: Partial<SiteConfig["taxonomySort"]["categories"]>;
			tags?: Partial<SiteConfig["taxonomySort"]["tags"]>;
		};
	};
	navBarConfig?: {
		links?: NavBarConfig["links"];
	};
	navBarI18n?: NavBarI18nConfig;
	profileConfig?: Omit<Partial<ProfileConfig>, "links"> & {
		links?: ProfileConfig["links"];
	};
	footerConfig?: Partial<FooterConfig>;
	licenseConfig?: Partial<LicenseConfig>;
	expressiveCodeConfig?: Partial<ExpressiveCodeConfig>;
	qingyanConfig?: QingYanClientConfig | null;
	commentConfig?: Partial<CommentConfig>;
	pageMetricsConfig?: Partial<PageMetricsConfig>;
	pageFeedbackConfig?: Partial<Omit<PageFeedbackConfig, "like" | "reward">> & {
		like?: Partial<PageFeedbackConfig["like"]>;
		reward?: Partial<PageFeedbackConfig["reward"]>;
	};
	qingyanDevProxyTarget?: string | null;
};

const trailingSlashStrategySchema = z.enum(["auto", "always", "never"]);
const aliasValidationModeSchema = z.enum(["error", "normalize"]);
const updatedDateModeSchema = z.enum(["manual", "git", "filesystem", "none"]);
const updatedDateFallbackSchema = z.enum(["none", "filesystem"]);
const postSortKeySchema = z.enum([
	"title",
	"published",
	"updated",
	"alias",
	"filename",
]);
const taxonomySortKeySchema = z.enum(["name", "count"]);
const uncategorizedPositionSchema = z.enum(["sorted", "last"]);
const sortOrderSchema = z.enum(["asc", "desc"]);
const taxonomySortSchema = z
	.object({
		key: taxonomySortKeySchema.optional(),
		order: sortOrderSchema.optional(),
	})
	.strict();
const tocDepthSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const siteUrlSchema = z.string().refine((value) => {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}, "Invalid site URL");
const qingyanSchema = z
	.object({
		siteKey: z.string(),
		apiBase: z.string().optional(),
	})
	.strict()
	.nullable()
	.optional();
const navBarContentRefSchema = z
	.object({
		collection: z.enum(["spec", "posts"]),
		id: z.string(),
	})
	.strict();
const navBarLinkBaseShape = {
	id: z.string().optional(),
	name: z.string(),
};
const navBarUrlLinkSchema = z
	.object({
		...navBarLinkBaseShape,
		url: z.string(),
		external: z.boolean().optional(),
	})
	.strict();
const navBarRefLinkSchema = z
	.object({
		...navBarLinkBaseShape,
		ref: navBarContentRefSchema,
	})
	.strict();
const rewardOptionSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		image: z.string(),
		alt: z.string().optional(),
	})
	.strict();

const externalSiteConfigSchema: z.ZodTypeAny = z
	.object({
		fangyuanConfigVersion: z.number().int().nonnegative().optional(),
		siteConfig: z
			.object({
				title: z.string().optional(),
				subtitle: z.string().optional(),
				site: siteUrlSchema.nullable().optional(),
				base: z.string().optional(),
				postsPerPage: z.number().int().nonnegative().nullable().optional(),
				showPinnedInArchiveTimeline: z.boolean().optional(),
				lang: z
					.enum([
						"en",
						"zh_CN",
						"zh_TW",
						"ja",
						"ko",
						"es",
						"th",
						"vi",
						"tr",
						"id",
					])
					.optional(),
				themeColor: z
					.object({
						hue: z.number().min(0).max(360).optional(),
						fixed: z.boolean().optional(),
					})
					.strict()
					.optional(),
				banner: z
					.object({
						enable: z.boolean().optional(),
						src: z.string().optional(),
						position: z.enum(["top", "center", "bottom"]).optional(),
						credit: z
							.object({
								enable: z.boolean().optional(),
								text: z.string().optional(),
								url: z.string().optional(),
							})
							.strict()
							.optional(),
					})
					.strict()
					.optional(),
				toc: z
					.object({
						enable: z.boolean().optional(),
						depth: tocDepthSchema.optional(),
					})
					.strict()
					.optional(),
				favicon: z
					.array(
						z
							.object({
								src: z.string(),
								theme: z.enum(["light", "dark"]).optional(),
								sizes: z.string().optional(),
							})
							.strict(),
					)
					.optional(),
				permalink: z
					.object({
						postsPattern: z.string().optional(),
						pagesPattern: z.string().optional(),
						trailingSlash: trailingSlashStrategySchema.optional(),
						postPatternRules: z
							.array(
								z
									.object({
										match: z.string(),
										pattern: z.string(),
									})
									.strict(),
							)
							.optional(),
						aliasValidation: aliasValidationModeSchema.optional(),
						updatedDateMode: updatedDateModeSchema.optional(),
						updatedDateFallback: updatedDateFallbackSchema.optional(),
					})
					.strict()
					.optional(),
				postSort: z
					.object({
						key: postSortKeySchema.optional(),
						order: sortOrderSchema.optional(),
					})
					.strict()
					.optional(),
				taxonomySort: z
					.object({
						categories: taxonomySortSchema
							.extend({
								uncategorizedPosition: uncategorizedPositionSchema.optional(),
							})
							.optional(),
						tags: taxonomySortSchema.optional(),
					})
					.strict()
					.optional(),
			})
			.strict()
			.optional(),
		navBarConfig: z
			.object({
				links: z
					.array(z.union([navBarUrlLinkSchema, navBarRefLinkSchema]))
					.optional(),
			})
			.strict()
			.optional(),
		navBarI18n: z.record(z.string(), z.string()).optional(),
		profileConfig: z
			.object({
				avatar: z.string().optional(),
				name: z.string().optional(),
				bio: z.string().optional(),
				links: z
					.array(
						z
							.object({
								name: z.string(),
								url: z.string(),
								icon: z.string(),
							})
							.strict(),
					)
					.optional(),
			})
			.strict()
			.optional(),
		footerConfig: z
			.object({
				customHtml: z.string().optional(),
				icp: z.string().nullable().optional(),
				policeRecord: z.string().nullable().optional(),
			})
			.strict()
			.optional(),
		licenseConfig: z
			.object({
				enable: z.boolean().optional(),
				name: z.string().optional(),
				url: z.string().optional(),
			})
			.strict()
			.optional(),
		expressiveCodeConfig: z
			.object({
				theme: z.string().optional(),
			})
			.strict()
			.optional(),
		qingyanConfig: qingyanSchema,
		commentConfig: z
			.object({
				enable: z.boolean().optional(),
				rootLimit: z.number().int().nonnegative().optional(),
				maxDepth: z.number().int().nonnegative().optional(),
			})
			.strict()
			.optional(),
		pageMetricsConfig: z
			.object({
				enable: z.boolean().optional(),
			})
			.strict()
			.optional(),
		pageFeedbackConfig: z
			.object({
				enable: z.boolean().optional(),
				like: z
					.object({
						enable: z.boolean().optional(),
					})
					.strict()
					.optional(),
				reward: z
					.object({
						enable: z.boolean().optional(),
						options: z.array(rewardOptionSchema).optional(),
					})
					.strict()
					.optional(),
			})
			.strict()
			.optional(),
		qingyanDevProxyTarget: z.string().nullable().optional(),
	})
	.strict();

export function loadExternalSiteConfigYaml(
	configPath: string,
): ExternalSiteConfigYaml | null {
	if (!fs.existsSync(configPath)) {
		return null;
	}

	const source = fs.readFileSync(configPath, "utf8");
	const parsed = parse(source) ?? {};
	return externalSiteConfigSchema.parse(parsed) as ExternalSiteConfigYaml;
}
