import { z } from "astro/zod";
import { parse } from "yaml";
import { resolveSiteConfiguration } from "../../site-configuration.ts";
import { resolvePublicQingYanConfig } from "./demo-qingyan-env.ts";
import {
	describeExternalSiteConfigSchema,
	parseExternalSiteConfig,
} from "./external-config.ts";
import { resolvePublicSiteConfigOverride } from "./public-deploy-env.ts";
import {
	normalizeConfiguredBase,
	normalizeConfiguredSite,
} from "./runtime-config.ts";

const groups: Record<string, string> = {
	siteConfig: "站点基础",
	"siteConfig.themeColor": "主题与外观",
	"siteConfig.banner": "主题与外观",
	"siteConfig.logo": "主题与外观",
	"siteConfig.favicon": "主题与外观",
	"siteConfig.toc": "文章显示",
	"siteConfig.githubCard": "文章显示",
	"siteConfig.notifications": "互动",
	"siteConfig.tags": "主题与外观",
	"siteConfig.permalink": "路由与排序",
	"siteConfig.postSort": "路由与排序",
	"siteConfig.taxonomySort": "路由与排序",
	navBarConfig: "导航",
	navBarI18n: "导航",
	profileConfig: "个人资料",
	footerConfig: "页脚与许可",
	licenseConfig: "页脚与许可",
	expressiveCodeConfig: "文章显示",
	qingyanConfig: "互动",
	qingyanDevProxyTarget: "互动",
	commentConfig: "互动",
	pageMetricsConfig: "互动",
	pageFeedbackConfig: "互动",
};

const labels: Record<string, string> = {
	fangyuanConfigVersion: "配置版本",
	"siteConfig.title": "站点标题",
	"siteConfig.subtitle": "站点副标题",
	"siteConfig.site": "网站地址",
	"siteConfig.base": "部署路径",
	"siteConfig.lang": "语言",
	"siteConfig.postsPerPage": "每页文章数",
	"siteConfig.showPinnedInArchiveTimeline": "时间轴显示置顶文章",
	"siteConfig.themeColor.hue": "主题色相",
	"siteConfig.themeColor.fixed": "固定主题色",
	"siteConfig.banner.enable": "启用横幅",
	"siteConfig.banner.src": "横幅图片",
	"siteConfig.banner.optics.insert": "透镜夹层图案",
	"siteConfig.banner.optics.prism": "分光元件",
	"siteConfig.banner.position": "横幅图片位置",
	"siteConfig.banner.credit.enable": "显示横幅署名",
	"siteConfig.banner.credit.text": "横幅署名",
	"siteConfig.banner.credit.url": "横幅署名链接",
	"siteConfig.logo": "导航栏 Logo",
	"siteConfig.favicon": "站点图标",
	"siteConfig.toc.enable": "显示文章目录",
	"siteConfig.toc.depth": "目录深度",
	"siteConfig.githubCard.descriptionLines": "GitHub 卡片简介行数",
	"siteConfig.notifications.position": "通知位置",
	"siteConfig.notifications.newestOnTop": "新通知置顶",
	"siteConfig.tags.showHash": "标签显示井号",
	"siteConfig.tags.showCount": "标签显示文章数",
	"siteConfig.permalink.postsPattern": "文章地址模板",
	"siteConfig.permalink.pagesPattern": "固定页地址模板",
	"siteConfig.permalink.trailingSlash": "末尾斜杠",
	"siteConfig.permalink.postPatternRules": "文章地址匹配规则",
	"siteConfig.permalink.aliasValidation": "别名校验",
	"siteConfig.permalink.updatedDateMode": "更新日期来源",
	"siteConfig.permalink.updatedDateFallback": "更新日期回退",
	"siteConfig.postSort.key": "文章排序字段",
	"siteConfig.postSort.order": "文章排序方向",
	"siteConfig.taxonomySort.categories.key": "分类排序字段",
	"siteConfig.taxonomySort.categories.order": "分类排序方向",
	"siteConfig.taxonomySort.categories.uncategorizedPosition": "未分类的位置",
	"siteConfig.taxonomySort.tags.key": "标签排序字段",
	"siteConfig.taxonomySort.tags.order": "标签排序方向",
	"navBarConfig.links": "导航链接",
	navBarI18n: "导航翻译",
	"profileConfig.name": "作者名称",
	"profileConfig.avatar": "头像",
	"profileConfig.bio": "简介",
	"profileConfig.linkEffect": "个人链接动效",
	"profileConfig.links": "个人链接",
	"footerConfig.customHtml": "页脚 HTML",
	"footerConfig.icp": "ICP备案",
	"footerConfig.policeRecord": "公安备案",
	"licenseConfig.enable": "显示许可证",
	"licenseConfig.name": "许可证名称",
	"licenseConfig.url": "许可证链接",
	"expressiveCodeConfig.theme": "代码块主题",
	qingyanConfig: "QingYan 站点",
	qingyanDevProxyTarget: "QingYan 开发代理",
	"commentConfig.enable": "显示评论",
	"commentConfig.rootLimit": "首屏评论数",
	"commentConfig.maxDepth": "评论嵌套深度",
	"pageMetricsConfig.enable": "显示访问数据",
	"pageFeedbackConfig.enable": "启用互动反馈",
	"pageFeedbackConfig.like.enable": "显示点赞",
	"pageFeedbackConfig.reward.enable": "显示打赏",
	"pageFeedbackConfig.reward.options": "打赏图片",
};

type Schema = {
	type?: string;
	properties?: Record<string, Schema>;
	anyOf?: Schema[];
	oneOf?: Schema[];
	enum?: (number | string)[];
	const?: number | string;
};

function valueAt(object: unknown, path: string[]): unknown {
	let value = object;
	for (const key of path) {
		if (!value || typeof value !== "object" || !Object.hasOwn(value, key))
			return undefined;
		value = (value as Record<string, unknown>)[key];
	}
	return value;
}

function inferControl(key: string, schema: Schema) {
	const alternatives = schema.anyOf ?? schema.oneOf ?? [schema];
	const nullable = alternatives.some((item) => item.type === "null");
	const options = alternatives.flatMap(
		(item) => item.enum ?? (item.const === undefined ? [] : [item.const]),
	);
	const types = new Set(alternatives.map((item) => item.type));
	types.delete("null");
	const type = types.size === 1 ? [...types][0] : undefined;
	const control =
		key === "navBarConfig.links"
			? "navigation"
			: key === "siteConfig.favicon" ||
					key === "pageFeedbackConfig.reward.options"
				? "assets"
				: key === "profileConfig.avatar" ||
						key === "siteConfig.banner.src" ||
						key === "siteConfig.banner.optics.insert"
					? "asset"
					: options.length
						? "select"
						: type === "string"
							? "text"
							: type === "integer" || type === "number"
								? "number"
								: type === "boolean"
									? "boolean"
									: "structured";
	return { control, options: options.length ? options : undefined, nullable };
}

function settingPaths(
	schema: Schema,
	path: string[] = [],
): { path: string[]; schema: Schema }[] {
	return schema.properties
		? Object.entries(schema.properties).flatMap(([key, child]) =>
				settingPaths(child, [...path, key]),
			)
		: [{ path, schema }];
}

interface SettingsDescription {
	version: 1;
	error?: string;
	fields: {
		path: string[];
		label: string;
		group: string;
		control: string;
		options?: (string | number)[];
		nullable: boolean;
		defaultValue?: unknown;
		effectiveValue?: unknown;
		override?: unknown;
		source: "environment" | "site" | "default";
	}[];
	site: { url: string | null; base: string };
}

export function describeStudioSettings(
	source: string,
	env: NodeJS.ProcessEnv = process.env,
): SettingsDescription {
	const siteEnvironment = resolvePublicSiteConfigOverride(env);
	const qingyanEnvironment = resolvePublicQingYanConfig(env, {
		allowDemoQingYan: env.PUBLIC_FANGYUAN_ALLOW_DEMO_QINGYAN === "true",
	});
	const defaults = resolveSiteConfiguration();
	const environment = {
		siteConfig: siteEnvironment,
		...(qingyanEnvironment
			? {
					qingyanConfig: qingyanEnvironment,
					commentConfig: { enable: true },
					pageMetricsConfig: { enable: true },
					pageFeedbackConfig: { enable: true, like: { enable: true } },
				}
			: {}),
	};
	const schema = describeExternalSiteConfigSchema() as Schema;
	let overrides: unknown;
	let effective = defaults;
	let error: string | undefined;
	try {
		overrides = parse(source);
		const valid = parseExternalSiteConfig(source);
		normalizeConfiguredSite(valid.siteConfig?.site);
		normalizeConfiguredBase(valid.siteConfig?.base);
		effective = resolveSiteConfiguration(
			valid,
			siteEnvironment,
			qingyanEnvironment,
		);
	} catch (cause) {
		error =
			cause instanceof z.ZodError
				? cause.issues
						.map(
							(issue) =>
								`${issue.path.join(".") || "site.config.yaml"} · ${issue.message}`,
						)
						.join("\n")
				: cause instanceof Error
					? cause.message
					: "站点配置无效。";
	}
	const fields: SettingsDescription["fields"] = settingPaths(schema).map(
		({ path, schema }) => {
			const key = path.join(".");
			const override = valueAt(overrides, path);
			const envValue = valueAt(environment, path);
			return {
				path,
				label: labels[key] ?? key,
				group:
					groups[path.slice(0, 2).join(".")] ??
					groups[path[0] ?? ""] ??
					"站点基础",
				...inferControl(key, schema),
				defaultValue: valueAt(defaults, path),
				effectiveValue:
					path[0] === "fangyuanConfigVersion"
						? override
						: valueAt(effective, path),
				override,
				source:
					envValue !== undefined
						? "environment"
						: override !== undefined
							? "site"
							: "default",
			};
		},
	);
	return {
		version: 1,
		error,
		fields,
		site: {
			url: effective.siteConfig.site ?? null,
			base: effective.siteConfig.base ?? "/",
		},
	};
}
