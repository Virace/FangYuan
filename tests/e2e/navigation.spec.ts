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

test("the pinned sidebar stays in place when opening a lower homepage article", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await gotoAndWaitForApp(page, SITE_ROUTES.home);
	const article = page.locator(`main a[data-transition-title][href="${SITE_ROUTES.postWithCover}"]`);
	const position = await article.evaluate(async (link: HTMLAnchorElement) => {
		link.scrollIntoView({ block: "center", behavior: "instant" });
		const sticky = document.getElementById("sidebar-sticky")!;
		const profileBottom = sticky.previousElementSibling!.getBoundingClientRect().bottom;
		const top = () => sticky.getBoundingClientRect().top;
		const before = top();
		const atNavigationStart = new Promise<number>(resolve => {
			window.swup.hooks.once("visit:start", () => { resolve(top()); });
		});
		link.click();
		return { profileBottom, before, after: await atNavigationStart };
	});
	expect(position.profileBottom).toBeLessThan(0);
	expect(Math.abs(position.after - position.before)).toBeLessThan(1);
	await expect(page.locator("#post-container")).toBeVisible();
	await expect(page.locator(".optical-transition-veil")).toHaveCount(0);
	expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("deep article navigation hides the old TOC and restores the new headings on scroll", async ({ page }) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await gotoAndWaitForApp(page, SITE_ROUTES.postComplex);
	const next = page.locator("main a:has(.post-nav-title)").first();
	await next.scrollIntoViewIfNeeded();
	const toc = page.locator("#toc-wrapper");
	await expect(toc).toHaveCSS("opacity", "1");
	const transition = await next.evaluate((link: HTMLAnchorElement) => {
		const rail = document.getElementById("toc-wrapper")!;
		const hitTesting = new Promise<string>(resolve => {
			window.swup.hooks.once("visit:start", () => resolve(getComputedStyle(rail).pointerEvents));
		});
		const result = new Promise<string>(resolve => {
			window.swup.hooks.before("content:replace", () => resolve(getComputedStyle(rail).opacity));
		});
		link.click();
		return Promise.all([hitTesting, result]);
	});
	expect(transition[0]).toBe("none");
	expect(Number(transition[1])).toBeLessThan(0.05);
	await expect(page.locator(".optical-transition-veil")).toHaveCount(0);
	await expect(toc).toHaveCSS("opacity", "0");
	await page.evaluate(() => window.scrollTo({ top: innerHeight, behavior: "instant" }));
	await expect(toc).toHaveCSS("opacity", "1");
	await expect(toc.locator("a[href^='#']").first()).toBeVisible();
});

test("reading position survives a covered deep article navigation and back", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await gotoAndWaitForApp(page, SITE_ROUTES.postComplex);
	const nextArticle = page.locator("main a:has(.post-nav-title)").first();
	await nextArticle.scrollIntoViewIfNeeded();
	const readingPosition = await page.evaluate(() => window.scrollY);
	expect(readingPosition).toBeGreaterThan(2500);
	const destination = await nextArticle.getAttribute("href");
	await nextArticle.click();
	const veil = page.locator(".optical-transition-veil");
	await expect(veil).toBeVisible();
	await expect(page).toHaveURL(new URL(destination!, page.url()).href);
	await expect(page.locator("main")).not.toHaveAttribute("aria-busy", "true");
	await expect(veil).toHaveCount(0);
	expect(await page.evaluate(() => window.scrollY)).toBe(0);

	await page.goBack();
	await expect(page.locator("main")).toHaveAttribute("data-swup-announcement", "Markdown 扩展功能");
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(readingPosition);
	await expect(veil).toHaveCount(0);
});

test("a second destination takes over while the first page is loading", async ({ page }) => {
	let release!: () => void;
	const delayed = new Promise<void>(resolve => { release = resolve; });
	await gotoAndWaitForApp(page, SITE_ROUTES.home);
	await page.route("**/archive/", async route => {
		await delayed;
		await route.continue();
	});
	const archive = page.locator('#navbar a[href="/archive/"]').first();
	const about = page.locator('#navbar a[href="/about/"]').first();
	try {
		await archive.click();
		await expect(page.locator(".optical-transition-veil")).toBeVisible();
		await about.click();
	} finally {
		release();
	}
	await expect(page.locator("main")).toContainText("关于");
	await expect(page.locator(".optical-transition-veil")).toHaveCount(0);
	await expect(page).toHaveURL(/\/about\/$/);
});

test("reduced motion navigates from a deep article without mounting a veil", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await gotoAndWaitForApp(page, SITE_ROUTES.postComplex);
	const veilMounted = await page.evaluateHandle(() => {
		const mounted: Element[] = [];
		new MutationObserver(records => {
			for (const record of records) {
				for (const node of record.addedNodes) {
					if (node instanceof Element && node.matches(".optical-transition-veil")) mounted.push(node);
				}
			}
		}).observe(document.body, { childList: true });
		return mounted;
	});
	const nextArticle = page.locator("main a:has(.post-nav-title)").first();
	await nextArticle.scrollIntoViewIfNeeded();
	expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(2500);
	const title = (await nextArticle.innerText()).trim();
	await nextArticle.click();
	await expect(page.locator("main")).toHaveAttribute("data-swup-announcement", title);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
	expect(await veilMounted.evaluate(nodes => nodes.length)).toBe(0);
});
