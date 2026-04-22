import assert from "node:assert/strict";
import test from "node:test";

import { defaultSiteConfig } from "../src/default-config.ts";

test("defaultSiteConfig exposes published desc as the default postSort", () => {
	assert.deepEqual(defaultSiteConfig.postSort, {
		key: "published",
		order: "desc",
	});
});
