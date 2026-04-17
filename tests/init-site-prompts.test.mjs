import assert from "node:assert/strict";
import test from "node:test";

import { normalizeInitSiteAnswers } from "../scripts/init-site-prompts.js";

test("normalizeInitSiteAnswers applies QingYan defaults and trims blanks", () => {
	const options = normalizeInitSiteAnswers({
		siteTitle: " Virace Notes ",
		siteSubtitle: " QingYan ready ",
		profileName: " Virace ",
		profileBio: "",
		qingyanSiteKey: " virace-notes ",
		qingyanDevProxyTarget: " http://localhost:4401 ",
		enableComments: "y",
		enablePageMetrics: "y",
		enablePageFeedback: "n",
		includeRewardPlaceholders: "n",
	});

	assert.deepEqual(options, {
		siteTitle: "Virace Notes",
		siteSubtitle: "QingYan ready",
		profileName: "Virace",
		profileBio: "",
		qingyanSiteKey: "virace-notes",
		qingyanApiBase: "/api",
		qingyanDevProxyTarget: "http://localhost:4401",
		enableComments: true,
		enablePageMetrics: true,
		enablePageFeedback: false,
		includeRewardPlaceholders: false,
	});
});
