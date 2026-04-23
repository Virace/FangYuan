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
	});

	assert.deepEqual(options, {
		siteTitle: "Virace Notes",
		siteSubtitle: "QingYan ready",
		profileName: "Virace",
		profileBio: "Write something here.",
		qingyanSiteKey: "virace-notes",
		qingyanDevProxyTarget: "http://localhost:4401",
	});
});
