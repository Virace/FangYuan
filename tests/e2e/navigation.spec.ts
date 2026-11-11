import { expect, test } from "@playwright/test";
import {
	SITE_ROUTES,
	VIEWPORTS,
	gotoAndWaitForApp,
	installConsoleErrorCollector,
	openMobileNavMenu,
} from "./support/site-fixtures";

test("mobile menu arrows keep drawing across swup navigation and history", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.mobile);
	await gotoAndWaitForApp(page, SITE_ROUTES.home);
	const panel = page.locator("#nav-menu-panel");
	const originalPanel = await panel.elementHandle();
	const arrows = panel.locator('a:not([target="_blank"]) svg');
	const arrowCount = await arrows.count();
	expect(arrowCount).toBeGreaterThan(0);

	async function expectMenuArrows() {
		await expect(page.locator("html")).not.toHaveClass(/\bis-changing\b/);
		expect(
			await panel.evaluate((element, original) => element === original, originalPanel),
		).toBe(true);
		if (
			await panel.evaluate(element => element.classList.contains("float-panel-closed"))
		) {
			await openMobileNavMenu(page);
		}
		await expect(arrows).toHaveCount(arrowCount);
		for (const arrow of await arrows.all()) {
			await expect(arrow).toBeVisible();
			await expect.poll(() =>
				arrow.evaluate(element => {
					const bounds = (element as SVGGraphicsElement).getBBox();
					return bounds.width > 0 && bounds.height > 0;
				}),
			).toBe(true);
		}
		expect(await arrows.evaluateAll(elements => elements.flatMap(element => {
			const references = Array.from(element.querySelectorAll("use"), use =>
				use.getAttribute("href") ?? use.getAttribute("xlink:href"),
			);
			return references.filter(reference =>
				reference?.startsWith("#") && !document.getElementById(reference.slice(1)),
			);
		}))).toEqual([]);
	}

	await expectMenuArrows();
	await panel.locator(`a[href="${SITE_ROUTES.about}"]`).click();
	await page.waitForURL(url => url.pathname === SITE_ROUTES.about);
	await expect(page.locator("main")).toContainText("关于");
	await expectMenuArrows();
	await page.goBack();
	await page.waitForURL(url => url.pathname === SITE_ROUTES.home);
	await expect(page.locator("main")).toContainText("Markdown 示例");
	await expectMenuArrows();
	await page.goForward();
	await page.waitForURL(url => url.pathname === SITE_ROUTES.about);
	await expect(page.locator("main")).toContainText("关于");
	await expectMenuArrows();
});

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
