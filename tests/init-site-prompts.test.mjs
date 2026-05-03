import assert from "node:assert/strict";
import test from "node:test";

import { normalizeInitSiteAnswers } from "../scripts/site/init-site-prompts.js";

test("normalizeInitSiteAnswers applies template defaults and trims blanks", () => {
	const options = normalizeInitSiteAnswers({
		siteTitle: " Virace Notes ",
		siteSubtitle: " QingYan ready ",
		profileName: " Virace ",
		profileBio: "",
		qingyanSiteKey: " virace-notes ",
		qingyanDevProxyTarget: " http://localhost:4401 ",
		includeFrontmatterConfig: "n",
		includeVSCodeConfig: "Y",
	});

	assert.deepEqual(options, {
		siteTitle: "Virace Notes",
		siteSubtitle: "QingYan ready",
		profileName: "Virace",
		profileBio: "Write something here.",
		qingyanSiteKey: "virace-notes",
		qingyanDevProxyTarget: "http://localhost:4401",
		includeFrontmatterConfig: false,
		includeVSCodeConfig: true,
	});
});

test("normalizeInitSiteAnswers enables editor configs by default", () => {
	const options = normalizeInitSiteAnswers({
		siteTitle: "",
		siteSubtitle: "",
		profileName: "",
		profileBio: "",
		qingyanSiteKey: "",
		qingyanDevProxyTarget: "",
		includeFrontmatterConfig: "",
		includeVSCodeConfig: "",
	});

	assert.equal(options.includeFrontmatterConfig, true);
	assert.equal(options.includeVSCodeConfig, true);
});
