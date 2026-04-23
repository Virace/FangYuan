function renderQingYanYaml({ enabled, siteKey, apiBase }, indent = "  ") {
	if (!enabled) {
		return `${indent}qingyan: null`
	}

	return `${indent}qingyan:
${indent}  siteKey: ${siteKey}
${indent}  apiBase: ${apiBase}`
}

function renderRewardOptionsYaml(includeRewardPlaceholders) {
	if (!includeRewardPlaceholders) {
		return "  rewardOptions: []"
	}

	return `  rewardOptions:
    - id: wechat
      name: 微信
      image: /images/reward/wechat-placeholder.svg
      alt: 微信打赏二维码
    - id: alipay
      name: 支付宝
      image: /images/reward/alipay-placeholder.svg
      alt: 支付宝打赏二维码`
}

export function buildSiteConfigTemplate(options) {
	const qingyanDevProxyLine = options.qingyanDevProxyTarget
		? `qingyanDevProxyTarget: ${options.qingyanDevProxyTarget}`
		: "qingyanDevProxyTarget: null"

	return `siteConfig:
  title: ${options.siteTitle}
  subtitle: ${options.siteSubtitle}

navBarI18n:
  nav.github: GitHub

navBarConfig:
  links:
    - name: nav.archive
      url: /archive/
    - name: nav.about
      ref:
        collection: spec
        id: about
    - id: nav.github
      name: nav.github
      url: https://github.com/yourname/yourrepo
      external: true

profileConfig:
  name: ${options.profileName}
  bio: ${options.profileBio}
  links: []

expressiveCodeConfig:
  theme: github-dark

${qingyanDevProxyLine}

commentConfig:
  enable: ${options.enableComments}
${renderQingYanYaml({
		enabled: options.enableComments,
		siteKey: options.qingyanSiteKey,
		apiBase: options.qingyanApiBase,
	})}

pageMetricsConfig:
  enable: ${options.enablePageMetrics}
${renderQingYanYaml({
		enabled: options.enablePageMetrics,
		siteKey: options.qingyanSiteKey,
		apiBase: options.qingyanApiBase,
	})}

pageFeedbackConfig:
  enable: ${options.enablePageFeedback}
${renderQingYanYaml({
		enabled: options.enablePageFeedback,
		siteKey: options.qingyanSiteKey,
		apiBase: options.qingyanApiBase,
	})}
${renderRewardOptionsYaml(options.includeRewardPlaceholders)}
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
