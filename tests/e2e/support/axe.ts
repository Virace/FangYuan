import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function getCriticalAndSeriousViolations(page: Page) {
	const results = await new AxeBuilder({ page })
		.disableRules(["color-contrast"])
		.analyze();

	return results.violations.filter((violation) => {
		return violation.impact === "critical" || violation.impact === "serious";
	});
}

export async function expectNoCriticalOrSeriousViolations(page: Page) {
	const violations = await getCriticalAndSeriousViolations(page);
	expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}
