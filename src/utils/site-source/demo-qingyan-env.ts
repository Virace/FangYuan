import type {
	CommentConfig,
	PageFeedbackConfig,
	PageMetricsConfig,
	QingYanClientConfig,
} from "../../types/config";

type PublicDeployEnv = Record<string, string | boolean | undefined>;
type PublicQingYanConfigOptions = {
	allowDemoQingYan?: boolean;
};

function readEnvString(env: PublicDeployEnv, name: string): string | undefined {
	const value = env[name];
	return typeof value === "string" ? value.trim() || undefined : undefined;
}

function readEnvFlag(env: PublicDeployEnv, name: string): boolean {
	const value = env[name];
	return value === true || value === "true";
}

export function resolvePublicQingYanConfig(
	env: PublicDeployEnv,
	options: PublicQingYanConfigOptions = {},
): QingYanClientConfig | null {
	if (
		!options.allowDemoQingYan ||
		!readEnvFlag(env, "PUBLIC_FANGYUAN_DEMO_QINGYAN")
	) {
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
	return qingyan ? { ...config, enable: true } : config;
}

export function applyPublicQingYanPageMetricsConfig(
	config: PageMetricsConfig,
	qingyan: QingYanClientConfig | null,
): PageMetricsConfig {
	return qingyan ? { ...config, enable: true } : config;
}

export function applyPublicQingYanPageFeedbackConfig(
	config: PageFeedbackConfig,
	qingyan: QingYanClientConfig | null,
): PageFeedbackConfig {
	return qingyan
		? {
				...config,
				enable: true,
				like: {
					...config.like,
					enable: true,
				},
			}
		: config;
}
