import assert from "node:assert/strict";
import test from "node:test";

import {
	buildSiteConfigTemplate,
	buildWelcomePostTemplate,
} from "../scripts/init-site-template.js";

test("buildSiteConfigTemplate renders QingYan-aware config with literal values", () => {
	const source = buildSiteConfigTemplate({
		siteTitle: "Virace Notes",
		siteSubtitle: "QingYan ready",
		profileName: "Virace",
		profileBio: "Personal notes",
		qingyanSiteKey: "virace-notes",
		qingyanApiBase: "/api",
		qingyanDevProxyTarget: "http://localhost:4401",
		enableComments: true,
		enablePageMetrics: true,
		enablePageFeedback: true,
		includeRewardPlaceholders: true,
	});

	assert.match(source, /siteConfig:/);
	assert.match(source, /title: Virace Notes/);
	assert.match(source, /qingyanDevProxyTarget: http:\/\/localhost:4401/);
	assert.match(source, /commentConfig:/);
	assert.match(source, /pageFeedbackConfig:/);
	assert.match(source, /siteKey: virace-notes/);
	assert.match(source, /apiBase: \/api/);
	assert.match(source, /rewardOptions:/);
});

test("buildWelcomePostTemplate keeps scaffold source and user-facing replacement hint", () => {
	const source = buildWelcomePostTemplate({
		siteTitle: "Virace Notes",
	});

	assert.match(source, /^---[\s\S]*title: Welcome to Virace Notes/m);
	assert.match(source, /This post is created by `node scripts\/init-site.js`/);
});

test("buildSiteConfigTemplate renders null qingyanDevProxyTarget when omitted", () => {
	const source = buildSiteConfigTemplate({
		siteTitle: "Virace Notes",
		siteSubtitle: "QingYan ready",
		profileName: "Virace",
		profileBio: "Personal notes",
		qingyanSiteKey: "virace-notes",
		qingyanApiBase: "/api",
		qingyanDevProxyTarget: null,
		enableComments: true,
		enablePageMetrics: true,
		enablePageFeedback: true,
		includeRewardPlaceholders: true,
	});

	assert.match(source, /qingyanDevProxyTarget: null/);
});
