import { expect, test } from "@playwright/test";
import {
	SITE_ROUTES,
	VIEWPORTS,
	openMobileNavMenu,
	prepareStablePage,
} from "./support/site-fixtures";

test("homepage main aria snapshot", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, SITE_ROUTES.home);

	await expect(page.locator("#swup-container")).toMatchAriaSnapshot({
		name: "home-main.aria.yml",
	});
});

test("article main aria snapshot", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, SITE_ROUTES.postBasic);

	await expect(page.locator("#swup-container")).toMatchAriaSnapshot({
		name: "article-main.aria.yml",
	});
});

test("mobile nav panel aria snapshot", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.mobile);
	await prepareStablePage(page, SITE_ROUTES.home);
	await openMobileNavMenu(page);

	await expect(page.locator("#nav-menu-panel")).toMatchAriaSnapshot({
		name: "mobile-nav-panel.aria.yml",
	});
});
