import { test } from "@playwright/test";
import {
	SITE_ROUTES,
	VIEWPORTS,
	gotoAndWaitForApp,
	openMobileNavMenu,
	openMobileSearchPanel,
	prepareStablePage,
	waitForPagefind,
} from "./support/site-fixtures";
import { expectNoCriticalOrSeriousViolations } from "./support/axe";

test("homepage has no critical or serious axe violations", async ({ page }) => {
	await gotoAndWaitForApp(page, SITE_ROUTES.home);
	await expectNoCriticalOrSeriousViolations(page);
});

test("about page has no critical or serious axe violations", async ({ page }) => {
	await gotoAndWaitForApp(page, SITE_ROUTES.about);
	await expectNoCriticalOrSeriousViolations(page);
});

test("archive page has no critical or serious axe violations", async ({ page }) => {
	await gotoAndWaitForApp(page, SITE_ROUTES.archive);
	await expectNoCriticalOrSeriousViolations(page);
});

test("basic article has no critical or serious axe violations", async ({
	page,
}) => {
	await gotoAndWaitForApp(page, SITE_ROUTES.postBasic);
	await expectNoCriticalOrSeriousViolations(page);
});

test("mobile search panel has no critical or serious axe violations", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.mobile);
	await prepareStablePage(page, SITE_ROUTES.home);
	await waitForPagefind(page);

	await openMobileSearchPanel(page);
	await page.locator("#search-bar-inside input").fill("Markdown");
	await expectNoCriticalOrSeriousViolations(page);
});

test("mobile nav menu has no critical or serious axe violations", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.mobile);
	await prepareStablePage(page, SITE_ROUTES.home);

	await openMobileNavMenu(page);
	await expectNoCriticalOrSeriousViolations(page);
});

test("swup navigation target page has no critical or serious axe violations", async ({
	page,
}) => {
	await gotoAndWaitForApp(page, SITE_ROUTES.home);
	await page.locator(`a[href="${SITE_ROUTES.postBasic}"]`).first().click();

	await page.waitForURL((url) => url.pathname === SITE_ROUTES.postBasic);
	await expectNoCriticalOrSeriousViolations(page);
});
