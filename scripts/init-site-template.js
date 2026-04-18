function renderQingYanConfigBlock({ enabled, siteKey, apiBase }) {
	if (!enabled) {
		return "null"
	}

	return `{
		siteKey: ${JSON.stringify(siteKey)},
		apiBase: ${JSON.stringify(apiBase)},
	}`
}

function renderRewardOptions(includeRewardPlaceholders) {
	if (!includeRewardPlaceholders) {
		return "[]"
	}

	return `[
		{
			id: "wechat",
			name: "微信",
			image: "/images/reward/wechat-placeholder.svg",
			alt: "微信打赏二维码",
		},
		{
			id: "alipay",
			name: "支付宝",
			image: "/images/reward/alipay-placeholder.svg",
			alt: "支付宝打赏二维码",
		},
	]`
}

export function buildSiteConfigTemplate(options) {
	const qingyanDevProxyLine = options.qingyanDevProxyTarget
		? `export const qingyanDevProxyTarget = ${JSON.stringify(options.qingyanDevProxyTarget)};`
		: '// export const qingyanDevProxyTarget = "http://localhost:4401";'

	return `import type {
	CommentConfig,
	PageFeedbackConfig,
	PageMetricsConfig,
} from "../src/types/config";

export const siteConfig = {
	title: ${JSON.stringify(options.siteTitle)},
	subtitle: ${JSON.stringify(options.siteSubtitle)},
};

export const navBarConfig = {
	links: [
		{ name: "Home", url: "/" },
		{ name: "Archive", url: "/archive/" },
		{ name: "About", url: "/about/" },
	],
};

export const profileConfig = {
	name: ${JSON.stringify(options.profileName)},
	bio: ${JSON.stringify(options.profileBio)},
	links: [],
};

export const expressiveCodeConfig = {
	theme: "github-dark",
};

${qingyanDevProxyLine}

export const commentConfig: CommentConfig = {
	enable: ${options.enableComments},
	qingyan: ${renderQingYanConfigBlock({
		enabled: options.enableComments,
		siteKey: options.qingyanSiteKey,
		apiBase: options.qingyanApiBase,
	})},
};

export const pageMetricsConfig: PageMetricsConfig = {
	enable: ${options.enablePageMetrics},
	qingyan: ${renderQingYanConfigBlock({
		enabled: options.enablePageMetrics,
		siteKey: options.qingyanSiteKey,
		apiBase: options.qingyanApiBase,
	})},
};

export const pageFeedbackConfig: PageFeedbackConfig = {
	enable: ${options.enablePageFeedback},
	qingyan: ${renderQingYanConfigBlock({
		enabled: options.enablePageFeedback,
		siteKey: options.qingyanSiteKey,
		apiBase: options.qingyanApiBase,
	})},
	rewardOptions: ${renderRewardOptions(options.includeRewardPlaceholders)},
};
`
}

export function buildWelcomePostTemplate(options) {
	return `---
title: Welcome to ${options.siteTitle}
published: 2026-04-14
description: The first scaffolded post for the external site content layer.
tags: [FangYuan, Site, Demo]
category: Getting Started
draft: false
---

# Welcome to ${options.siteTitle}

This post is created by \`node scripts/init-site.js\` to keep a fresh \`site/\` scaffold buildable.

- Replace this file with your own first post when you are ready.
- If your \`site/\` already contains real files, the scaffold script will not backfill demo posts.
`
}
