import type {
	CommentConfig,
	PageFeedbackConfig,
	PageMetricsConfig,
	QingYanClientConfig,
	SiteConfig,
} from "../types/config";
import {
	normalizeConfiguredBase,
	normalizeConfiguredSite,
} from "./site-runtime-config.ts";

type PublicDeployEnv = Record<string, string | boolean | undefined>;

function readEnvString(env: PublicDeployEnv, name: string): string | undefined {
	const value = env[name];
	return typeof value === "string" ? value.trim() || undefined : undefined;
}

function readEnvFlag(env: PublicDeployEnv, name: string): boolean {
	const value = env[name];
	return value === true || value === "true";
}

export function resolvePublicSiteConfigOverride(
	env: PublicDeployEnv,
): Partial<SiteConfig> | null {
	const site = readEnvString(env, "PUBLIC_FANGYUAN_SITE");
	const base = readEnvString(env, "PUBLIC_FANGYUAN_BASE");
	if (!site && base === undefined) {
		return null;
	}

	return {
		...(site ? { site: normalizeConfiguredSite(site) } : {}),
		...(base !== undefined ? { base: normalizeConfiguredBase(base) } : {}),
	};
}

export function resolvePublicQingYanConfig(
	env: PublicDeployEnv,
): QingYanClientConfig | null {
	if (!readEnvFlag(env, "PUBLIC_FANGYUAN_DEMO_QINGYAN")) {
		return null;
	}

	return {
		siteKey:
			readEnvString(env, "PUBLIC_FANGYUAN_QINGYAN_SITE_KEY") ?? "default",
		apiBase: readEnvString(env, "PUBLIC_FANGYUAN_QINGYAN_API_BASE") ?? "/api",
	};
}

export function applyPublicQingYanCommentConfig(
	config: CommentConfig,
	qingyan: QingYanClientConfig | null,
): CommentConfig {
	return qingyan ? { ...config, enable: true, qingyan } : config;
}

export function applyPublicQingYanPageMetricsConfig(
	config: PageMetricsConfig,
	qingyan: QingYanClientConfig | null,
): PageMetricsConfig {
	return qingyan ? { ...config, enable: true, qingyan } : config;
}

export function applyPublicQingYanPageFeedbackConfig(
	config: PageFeedbackConfig,
	qingyan: QingYanClientConfig | null,
): PageFeedbackConfig {
	return qingyan
		? {
				...config,
				enable: true,
				qingyan,
				like: {
					...config.like,
					enable: true,
				},
			}
		: config;
}
