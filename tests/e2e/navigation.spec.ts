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

	await expect(page).toHaveTitle(/Markdown 示例 - FangYuan/);
	await expect(page.locator("#post-container")).toContainText("Markdown 示例");
	await expect(page.locator("[data-swup-announcement]")).toHaveAttribute(
		"data-swup-announcement",
		"Markdown 示例",
	);
	expect(consoleErrors).toEqual([]);
});

test("swup navigation keeps article toc in the right rail", async ({ page }) => {
	await page.setViewportSize({ width: 1600, height: 900 });

	await gotoAndWaitForApp(page, SITE_ROUTES.home);
	await page.locator(`a[href="${SITE_ROUTES.postBasic}"]`).first().click();
	await page.waitForURL((url) => url.pathname === SITE_ROUTES.postBasic);

	const tocWrapper = page.locator("#toc-wrapper");
	await expect(tocWrapper).toBeAttached();

	const metrics = await page.evaluate(() => {
		const readRect = (selector: string) => {
			const element = document.querySelector(selector);
			if (!element) {
				throw new Error(`Missing element: ${selector}`);
			}

			const rect = element.getBoundingClientRect();
			return {
				left: rect.left,
				right: rect.right,
				width: rect.width,
			};
		};

		return {
			sidebar: readRect("#sidebar"),
			main: readRect("main"),
			toc: readRect("#toc-wrapper"),
		};
	});

	expect(metrics.toc.width).toBeGreaterThan(0);
	expect(metrics.toc.left).toBeGreaterThan(metrics.sidebar.right);
	expect(metrics.toc.left).toBeGreaterThan(metrics.main.right);
});
