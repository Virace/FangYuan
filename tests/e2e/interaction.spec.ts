import { expect, test, type Locator } from "@playwright/test";
import {
	SITE_ROUTES,
	VIEWPORTS,
	disableMotion,
	gotoAndWaitForApp,
	openMobileNavMenu,
	openMobileSearchPanel,
	prepareStablePage,
	waitForPagefind,
} from "./support/site-fixtures";

async function readComputedStyleValue(locator: Locator, property: string) {
	return locator.evaluate(
		(node, styleProperty) =>
			getComputedStyle(node as HTMLElement).getPropertyValue(styleProperty),
		property,
	);
}

async function readComputedRgb(locator: Locator, property: string) {
	return locator.evaluate((node, styleProperty) => {
		const value = getComputedStyle(node as HTMLElement)
			.getPropertyValue(styleProperty)
			.trim();
		const match = value.match(
			/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/,
		);

		if (!match) {
			throw new Error(`Expected ${styleProperty} to be rgb/rgba, got ${value}`);
		}

		return {
			value,
			red: Number(match[1]),
			green: Number(match[2]),
			blue: Number(match[3]),
		};
	}, property);
}

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

test("desktop search field shows a visible focus treatment without transition-all", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, SITE_ROUTES.home);

	const searchShell = page.locator("#search-bar");
	const searchInput = searchShell.locator("input");
	await searchInput.focus();

	await expect
		.poll(async () => {
			const boxShadow = await readComputedStyleValue(searchShell, "box-shadow");
			return boxShadow.trim();
		})
		.not.toBe("none");
	await expect
		.poll(async () => {
			const transitionProperty = await readComputedStyleValue(
				searchShell,
				"transition-property",
			);
			return transitionProperty.trim();
		})
		.not.toBe("all");
});

test("desktop search input keeps readable text color in dark mode", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await page.addInitScript(() => {
		localStorage.setItem("theme", "dark");
		localStorage.setItem("hue", "250");
	});
	await gotoAndWaitForApp(page, SITE_ROUTES.home);
	await disableMotion(page);

	const searchInput = page.locator("#search-bar input");
	await expect(searchInput).toBeVisible();
	await searchInput.fill("Markdown");

	const color = await readComputedRgb(searchInput, "color");
	expect(color.red).toBeGreaterThan(200);
	expect(color.green).toBeGreaterThan(200);
	expect(color.blue).toBeGreaterThan(200);
});

test("swup container transition avoids transition-all", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, SITE_ROUTES.postBasic);

	await page.evaluate(() => {
		document.documentElement.classList.add("is-changing");
	});

	const swupContainer = page.locator("#swup-container");
	await expect
		.poll(async () => {
			const transitionProperty = await readComputedStyleValue(
				swupContainer,
				"transition-property",
			);
			return transitionProperty.trim();
		})
		.not.toBe("all");
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

test("spec page does not render toc by default", async ({ page }) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await prepareStablePage(page, SITE_ROUTES.about);

	await expect(page.locator("#toc-wrapper")).toHaveCount(0);
	await expect(page.locator("#toc a")).toHaveCount(0);
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

test("default internal baseline omits comment section when qingyan backend is not configured", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, SITE_ROUTES.postBasic);

	const commentSection = page.locator('section[data-post-title]');
	await expect(commentSection).toHaveCount(0);
	await expect(page.getByText("当前暂未开放评论。")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "发表评论" })).toHaveCount(0);
});
