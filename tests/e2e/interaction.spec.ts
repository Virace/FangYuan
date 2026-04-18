import { expect, test, type Locator, type Page } from "@playwright/test";
import {
	SITE_ROUTES,
	VIEWPORTS,
	gotoAndWaitForApp,
	openMobileNavMenu,
	openMobileSearchPanel,
	prepareStablePage,
	waitForPagefind,
} from "./support/site-fixtures";

function buildEmptyCommentsBootstrapResponse() {
	return {
		capability: {
			enabled: true,
			supportsReply: true,
			supportsVote: false,
			supportsCaptcha: false,
			defaultStatus: "approved",
		},
		commentForm: {
			allow: ["nickname", "email", "website"],
			require: ["nickname", "email"],
		},
		thread: {
			siteKey: "fangyuan",
			pageKey: "markdown",
			pageTitle: "Markdown Syntax Guide",
		},
		pagination: {
			sortBy: "newest",
			limit: 5,
			offset: 0,
			totalCount: 0,
			rootCount: 0,
		},
		comments: [],
		pageMetrics: {
			pageViewCount: 12,
		},
		pageFeedback: {
			supportsLike: true,
			likeCount: 0,
			liked: false,
		},
		captcha: {
			required: false,
			verified: false,
			mode: null,
			challenge: null,
		},
	};
}

function buildEmptyCommentsThreadResponse(sortBy: "newest" | "oldest") {
	return {
		thread: {
			siteKey: "fangyuan",
			pageKey: "markdown",
			pageTitle: "Markdown Syntax Guide",
		},
		pagination: {
			sortBy,
			limit: 5,
			offset: 0,
			totalCount: 0,
			rootCount: 0,
		},
		comments: [],
	};
}

async function installEmptyCommentsApiStub(page: Page) {
	let notifyThreadRequestSeen: (() => void) | undefined;
	const threadRequestSeen = new Promise<void>((resolve) => {
		notifyThreadRequestSeen = resolve;
	});
	let releaseThreadResponse: (() => void) | undefined;
	const threadResponseGate = new Promise<void>((resolve) => {
		releaseThreadResponse = resolve;
	});

	await page.route("**/api/comments/bootstrap/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(buildEmptyCommentsBootstrapResponse()),
		});
	});

	await page.route("**/api/comments/thread/**", async (route) => {
		notifyThreadRequestSeen?.();
		notifyThreadRequestSeen = undefined;
		await threadResponseGate;

		const url = new URL(route.request().url());
		const requestedSort = url.searchParams.get("sortBy") === "oldest"
			? "oldest"
			: "newest";
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(buildEmptyCommentsThreadResponse(requestedSort)),
		});
	});

	return {
		threadRequestSeen,
		releaseThreadResponse: () => releaseThreadResponse?.(),
	};
}

async function readDocumentTop(locator: Locator) {
	return locator.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		return rect.top + window.scrollY;
	});
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

test("empty comment sort switch keeps composer position stable", async ({
	page,
}) => {
	const commentTestRoute = "/posts/welcome/";

	await page.setViewportSize(VIEWPORTS.desktop);
	const commentApiStub = await installEmptyCommentsApiStub(page);
	await prepareStablePage(page, commentTestRoute);

	const commentSection = page.locator('section[data-post-title]');
	const contentShell = commentSection.locator(".comments-content-shell");
	const emptyState = commentSection.locator(".comment-empty-state");
	const composerForm = commentSection.locator("form");
	const submitButton = composerForm.locator('button[type="submit"]');
	const sortOldestButton = commentSection.getByRole("button", {
		name: /最早在前|Oldest first/,
	});

	await expect(emptyState).toBeVisible();
	await expect(submitButton).toBeVisible();
	const beforeTop = await readDocumentTop(submitButton);

	const triggerSortSwitch = sortOldestButton.click();
	await commentApiStub.threadRequestSeen;

	await expect(contentShell).toHaveAttribute("aria-busy", "true");
	await expect(emptyState).toBeVisible();
	await expect(commentSection.locator(".comment-thread-skeleton")).toHaveCount(0);
	await expect(submitButton).toBeVisible();
	const loadingTop = await readDocumentTop(submitButton);
	expect(Math.abs(loadingTop - beforeTop)).toBeLessThanOrEqual(1);

	commentApiStub.releaseThreadResponse();
	await triggerSortSwitch;
	await expect(sortOldestButton).toBeDisabled();
	await expect(emptyState).toBeVisible();
	await expect(submitButton).toBeVisible();
	const afterTop = await readDocumentTop(submitButton);
	expect(Math.abs(afterTop - beforeTop)).toBeLessThanOrEqual(1);
});

test("empty comment submit highlights required fields and focuses the first invalid input", async ({
	page,
}) => {
	const commentTestRoute = "/posts/welcome/";

	await page.setViewportSize(VIEWPORTS.desktop);
	await installEmptyCommentsApiStub(page);
	await prepareStablePage(page, commentTestRoute);

	const composer = page.locator('section[data-post-title] form');
	const submitButton = composer.getByRole("button", { name: "发表评论" });
	const nameInput = composer.locator('input[type="text"]').first();
	const emailInput = composer.locator('input[type="email"]');
	const contentInput = composer.locator("textarea");

	await expect(submitButton).toBeEnabled();
	await submitButton.click();

	await expect(nameInput).toBeFocused();
	await expect(nameInput).toHaveAttribute("aria-invalid", "true");
	await expect(emailInput).toHaveAttribute("aria-invalid", "true");
	await expect(contentInput).toHaveAttribute("aria-invalid", "true");

	await page.waitForTimeout(900);
	await expect(nameInput).toHaveAttribute("aria-invalid", "true");
	await expect(emailInput).toHaveAttribute("aria-invalid", "true");
	await expect(contentInput).toHaveAttribute("aria-invalid", "true");

	await nameInput.fill("Smoke Tester");
	await expect(nameInput).toHaveAttribute("aria-invalid", "false");
	await expect(emailInput).toHaveAttribute("aria-invalid", "true");
	await expect(contentInput).toHaveAttribute("aria-invalid", "true");
});

test("comment emoji trigger keeps the emoji visually centered", async ({ page }) => {
	const commentTestRoute = "/posts/welcome/";

	await page.setViewportSize(VIEWPORTS.desktop);
	await installEmptyCommentsApiStub(page);
	await prepareStablePage(page, commentTestRoute);

	const triggerButton = page.locator(".comment-emoji-trigger").first();
	const triggerIcon = page.locator(".comment-emoji-trigger-icon").first();

	const buttonBox = await triggerButton.boundingBox();
	const iconBox = await triggerIcon.boundingBox();
	expect(buttonBox).not.toBeNull();
	expect(iconBox).not.toBeNull();

	const buttonCenterX = (buttonBox?.x ?? 0) + (buttonBox?.width ?? 0) / 2;
	const buttonCenterY = (buttonBox?.y ?? 0) + (buttonBox?.height ?? 0) / 2;
	const iconCenterX = (iconBox?.x ?? 0) + (iconBox?.width ?? 0) / 2;
	const iconCenterY = (iconBox?.y ?? 0) + (iconBox?.height ?? 0) / 2;

	expect(Math.abs(iconCenterX - buttonCenterX)).toBeLessThanOrEqual(3);
	expect(Math.abs(iconCenterY - buttonCenterY)).toBeLessThanOrEqual(3);
	await expect(triggerIcon).toHaveCSS("transform", "none");
});
