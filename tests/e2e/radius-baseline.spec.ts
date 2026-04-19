import { test } from "@playwright/test";

import {
	assertRadiusBaseline,
	RUNTIME_RADIUS_BASELINE_TARGETS,
} from "./support/radius-baseline";

test("default radius baseline matches the recorded original sources", async ({
	page,
}) => {
	await assertRadiusBaseline(page, 3, RUNTIME_RADIUS_BASELINE_TARGETS);
});

test("radius level 6 scales the recorded baseline proportionally", async ({
	page,
}) => {
	await assertRadiusBaseline(page, 6, RUNTIME_RADIUS_BASELINE_TARGETS);
});

test("radius level 0 collapses the recorded baseline proportionally", async ({
	page,
}) => {
	await assertRadiusBaseline(page, 0, RUNTIME_RADIUS_BASELINE_TARGETS);
});
