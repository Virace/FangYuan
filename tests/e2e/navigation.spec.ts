import { expect, test } from "@playwright/test";
import {
	SITE_ROUTES,
	gotoAndWaitForApp,
	installConsoleErrorCollector,
} from "./support/site-fixtures";

test("swup navigation updates title and article shell", async ({ page }) => {
	const consoleErrors = installConsoleErrorCollector(page);

	await gotoAndWaitForApp(page, SITE_ROUTES.home);
	await page
		.getByRole("link", { name: /Markdown Baseline Sample/i })
		.first()
		.click();

	await page.waitForURL("**/posts/markdown/");

	await expect(page).toHaveTitle(/Markdown Baseline Sample - FangYuan/);
	await expect(page.locator("#post-container")).toContainText(
		"Markdown Baseline Sample",
	);
	await expect(page.locator("[data-swup-announcement]")).toHaveAttribute(
		"data-swup-announcement",
		"Markdown Baseline Sample",
	);
	expect(consoleErrors).toEqual([]);
});
