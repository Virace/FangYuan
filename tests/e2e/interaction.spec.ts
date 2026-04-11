import { expect, test } from "@playwright/test";
import {
	SITE_ROUTES,
	VIEWPORTS,
	gotoAndWaitForApp,
	openMobileNavMenu,
	openMobileSearchPanel,
	prepareStablePage,
	waitForPagefind,
} from "./support/site-fixtures";

test("mobile search panel opens and shows search results", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.mobile);
	await prepareStablePage(page, SITE_ROUTES.home);
	await waitForPagefind(page);

	await openMobileSearchPanel(page);
	await page.locator("#search-bar-inside input").fill("Markdown");

	await expect(page.locator("#search-panel a").first()).toBeVisible();
	await expect(page.locator("#search-panel")).toContainText("Markdown");
});

test("mobile nav menu opens and closes after outside click", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.mobile);
	await prepareStablePage(page, SITE_ROUTES.home);

	await openMobileNavMenu(page);
	await page.locator("body").click({ position: { x: 10, y: 200 } });

	await expect(page.locator("#nav-menu-panel")).toHaveClass(/float-panel-closed/);
});

test("desktop display settings updates stored hue", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, SITE_ROUTES.home);

	await page.getByRole("button", { name: "Display Settings" }).click();
	await expect(page.locator("#display-setting")).not.toHaveClass(/float-panel-closed/);

	await page.locator("#colorSlider").evaluate((element) => {
		const input = element as HTMLInputElement;
		input.value = "180";
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
	});

	await expect
		.poll(async () => page.evaluate(() => localStorage.getItem("hue")))
		.toBe("180");
	await expect
		.poll(async () =>
			page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue("--hue").trim(),
			),
		)
		.toBe("180");
});

test("desktop toc updates hash when first heading is clicked", async ({ page }) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await prepareStablePage(page, SITE_ROUTES.postBasic);

	await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
	await expect(page.locator("#toc-wrapper")).not.toHaveClass(/toc-hide|toc-not-ready/);

	const firstTocLink = page.locator("#toc a").first();
	await expect(firstTocLink).toBeVisible();

	const href = await firstTocLink.getAttribute("href");
	await firstTocLink.click();

	await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test("desktop back-to-top button appears after scroll and returns to top", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, SITE_ROUTES.postBasic);

	await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));
	await expect(page.locator("#back-to-top-btn")).not.toHaveClass(/hide/);

	await page.locator("#back-to-top-btn").click();

	await expect
		.poll(async () => page.evaluate(() => Math.round(window.scrollY)))
		.toBe(0);
});

test("photoswipe assets are scoped to image pages and cover click opens lightbox", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, SITE_ROUTES.home);

	await expect(page.locator('link[data-photoswipe-style="true"]')).toHaveCount(0);

	await gotoAndWaitForApp(page, SITE_ROUTES.postWithCover);
	await expect(page.locator('link[data-photoswipe-style="true"]')).toHaveCount(1);

	await page.locator("#post-cover img").click();
	await expect(page.locator(".pswp")).toBeVisible();
});
