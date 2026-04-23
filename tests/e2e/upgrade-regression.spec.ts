import { expect, test } from "@playwright/test";
import {
	SITE_ROUTES,
	disableMotion,
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

	await page.locator(`a[href="${SITE_ROUTES.postBasic}"]`).first().click();
	await page.waitForURL((url) => url.pathname === SITE_ROUTES.postBasic);
	await expect(page.locator("#swup-container")).toBeVisible();
	await expect(page).toHaveTitle(/Markdown Example - FangYuan/);
	await expect(page.locator("[data-swup-announcement]")).toHaveAttribute(
		"data-swup-announcement",
		"Markdown Example",
	);

	expect(consoleErrors).toEqual([]);
});

test("markdown heading anchors keep compact inline spacing", async ({ page }) => {
	await gotoAndWaitForApp(page, SITE_ROUTES.postComplex);

	const headingAnchor = page
		.locator(".custom-md h2 .anchor, .custom-md h1 .anchor, .custom-md h3 .anchor")
		.first();

	const anchorStyle = await headingAnchor.evaluate((anchor) => {
		const style = getComputedStyle(anchor);
		return {
			display: style.display,
			marginLeft: Number.parseFloat(style.marginLeft),
			paddingLeft: Number.parseFloat(style.paddingLeft),
			paddingTop: Number.parseFloat(style.paddingTop),
		};
	});

	expect(anchorStyle.display).toBe("inline");
	expect(anchorStyle.marginLeft).toBeGreaterThan(1);
	expect(anchorStyle.marginLeft).toBeLessThan(4);
	expect(anchorStyle.paddingLeft).toBeCloseTo(2, 3);
	expect(anchorStyle.paddingTop).toBeCloseTo(2, 3);
});

test("markdown inline links do not expand paragraph height on hover", async ({ page }) => {
	await gotoAndWaitForApp(page, SITE_ROUTES.postComplex);
	await disableMotion(page);

	const inlineLink = page
		.locator(".custom-md a:not(.no-styling):not(.anchor)")
		.first();

	const readParagraphHeights = () => inlineLink.evaluate((anchor) => {
		const paragraph = anchor.closest("p");
		if (!(paragraph instanceof HTMLElement)) {
			throw new Error("Expected markdown inline link to be inside a paragraph.");
		}

		return {
			linkHeight: anchor.getBoundingClientRect().height,
			paragraphHeight: paragraph.getBoundingClientRect().height,
		};
	});

	await inlineLink.scrollIntoViewIfNeeded();
	const before = await readParagraphHeights();

	await inlineLink.hover();
	const hovered = await readParagraphHeights();

	expect(hovered.paragraphHeight).toBe(before.paragraphHeight);
});

test("markdown inline links keep dashed underline on hover", async ({ page }) => {
	await gotoAndWaitForApp(page, SITE_ROUTES.postComplex);
	await disableMotion(page);

	const inlineLink = page
		.locator(".custom-md a:not(.no-styling):not(.anchor)")
		.first();

	const beforeStyle = await inlineLink.evaluate((anchor) => {
		const style = getComputedStyle(anchor);
		return {
			textDecorationLine: style.textDecorationLine,
			borderBottomWidth: style.borderBottomWidth,
		};
	});

	await inlineLink.hover();

	const hoveredStyle = await inlineLink.evaluate((anchor) => {
		const style = getComputedStyle(anchor);
		return {
			color: style.color,
			textDecorationLine: style.textDecorationLine,
			textDecorationStyle: style.textDecorationStyle,
			borderBottomWidth: style.borderBottomWidth,
			borderBottomStyle: style.borderBottomStyle,
			borderBottomColor: style.borderBottomColor,
		};
	});

	expect(beforeStyle.textDecorationLine).toBe("underline");
	expect(beforeStyle.borderBottomWidth).toBe("1px");
	expect(hoveredStyle.textDecorationLine).toBe("none");
	expect(hoveredStyle.textDecorationStyle).toBe("solid");
	expect(hoveredStyle.borderBottomWidth).toBe("1px");
	expect(hoveredStyle.borderBottomStyle).toBe("dashed");
	expect(hoveredStyle.borderBottomColor).toBe(hoveredStyle.color);
});

test("css-first dark variant still flips token-backed navbar colors", async ({
	page,
}) => {
	await gotoAndWaitForApp(page, SITE_ROUTES.home);

	const brand = page.locator("#navbar a").first();
	const readColor = () =>
		brand.locator("div").first().evaluate((el) => getComputedStyle(el).color);

	const lightColor = await readColor();

	await page.locator("html").evaluate((el) => el.classList.add("dark"));
	await expect
		.poll(async () => readColor(), {
			message: "navbar brand color should change after enabling dark mode",
		})
		.not.toBe(lightColor);
});
