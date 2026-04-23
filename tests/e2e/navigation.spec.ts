import { expect, test } from "@playwright/test";
import {
	SITE_ROUTES,
	gotoAndWaitForApp,
	installConsoleErrorCollector,
} from "./support/site-fixtures";

test("swup navigation updates title and article shell", async ({ page }) => {
	const consoleErrors = installConsoleErrorCollector(page);

	await gotoAndWaitForApp(page, SITE_ROUTES.home);
	await page.locator(`a[href="${SITE_ROUTES.postBasic}"]`).first().click();

	await page.waitForURL((url) => url.pathname === SITE_ROUTES.postBasic);

	await expect(page).toHaveTitle(/Markdown Example - FangYuan/);
	await expect(page.locator("#post-container")).toContainText("Markdown Example");
	await expect(page.locator("[data-swup-announcement]")).toHaveAttribute(
		"data-swup-announcement",
		"Markdown Example",
	);
	expect(consoleErrors).toEqual([]);
});
