import { expect, test } from "@playwright/test";
import {
	SITE_ROUTES,
	gotoAndWaitForApp,
	installConsoleErrorCollector,
} from "./support/site-fixtures";

test("cross-template swup route flow stays stable", async ({ page }) => {
	const consoleErrors = installConsoleErrorCollector(page);

	await gotoAndWaitForApp(page, SITE_ROUTES.home);
	const homeTitle = await page.title();
	await expect(page.locator("#swup-container")).toBeVisible();

	await page.locator('#navbar a[href="/about/"]').first().click();
	await page.waitForURL("**/about/");
	await expect(page.locator("#swup-container")).toBeVisible();
	await expect(page).not.toHaveTitle(homeTitle);
	const aboutTitle = await page.title();

	await page.locator('#navbar a[href="/archive/"]').first().click();
	await page.waitForURL("**/archive/");
	await expect(page.locator("#swup-container")).toBeVisible();
	await expect(page).not.toHaveTitle(aboutTitle);

	await page.getByRole("link", { name: /Markdown Baseline Sample/i }).first().click();
	await page.waitForURL("**/posts/markdown/");
	await expect(page.locator("#swup-container")).toBeVisible();
	await expect(page).toHaveTitle(/Markdown Baseline Sample - FangYuan/);
	await expect(page.locator("[data-swup-announcement]")).toHaveAttribute(
		"data-swup-announcement",
		"Markdown Baseline Sample",
	);

	expect(consoleErrors).toEqual([]);
});
