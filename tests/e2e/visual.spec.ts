import { expect, test } from "@playwright/test";
import {
	SITE_ROUTES,
	VIEWPORTS,
	openMobileNavMenu,
	openMobileSearchPanel,
	prepareStablePage,
	waitForPagefind,
} from "./support/site-fixtures";

test("homepage desktop visual baseline", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, SITE_ROUTES.home);

	await expect(page).toHaveScreenshot("home-desktop.png", {
		animations: "disabled",
		caret: "hide",
		fullPage: true,
	});
});

test("basic article mobile visual baseline", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.mobile);
	await prepareStablePage(page, SITE_ROUTES.postBasic);

	await expect(page).toHaveScreenshot("article-mobile.png", {
		animations: "disabled",
		caret: "hide",
		fullPage: true,
	});
});

test("mobile search panel visual baseline", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.mobile);
	await prepareStablePage(page, SITE_ROUTES.home);
	await waitForPagefind(page);

	await openMobileSearchPanel(page);
	await page.locator("#search-bar-inside input").fill("Markdown");
	await expect(page.locator("#search-panel a").first()).toBeVisible();

	await expect(page).toHaveScreenshot("search-panel-mobile.png", {
		animations: "disabled",
		caret: "hide",
		fullPage: false,
	});
});

test("mobile nav menu visual baseline", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.mobile);
	await prepareStablePage(page, SITE_ROUTES.home);

	await openMobileNavMenu(page);

	await expect(page).toHaveScreenshot("nav-menu-mobile.png", {
		animations: "disabled",
		caret: "hide",
		fullPage: false,
	});
});

test("article toc desktop visual baseline", async ({ page }) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await prepareStablePage(page, SITE_ROUTES.postBasic);
	await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
	await expect(page.locator("#toc-wrapper")).not.toHaveClass(/toc-hide|toc-not-ready/);

	await expect(page).toHaveScreenshot("article-toc-desktop.png", {
		animations: "disabled",
		caret: "hide",
		fullPage: false,
	});
});
