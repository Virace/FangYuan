import { expect, test, type Page } from "@playwright/test";
import {
	gotoAndWaitForApp,
	prepareStablePage,
	VIEWPORTS,
} from "./support/site-fixtures";

const PAGE_FEEDBACK_ROUTE = "/posts/test-pagination/pagination-test-01/";
const PAGE_FEEDBACK_SWUP_ROUTE = "/posts/test-pagination/pagination-test-02/";

async function installSharedPageFeedbackApiMocks(page: Page) {
	await page.route("**/artalk-api/api/v2/captcha/status/", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				required: false,
				verified: false,
			}),
		});
	});

	await page.route("**/artalk-api/api/v2/pages/pv/", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ pv: 108 }),
		});
	});
}

test("page feedback reuses comment page snapshots, supports reward tab switching, and locks one-time likes", async ({
	page,
}) => {
	let commentsRequests = 0;
	let pageVoteStatusRequests = 0;
	let pageVotePostRequests = 0;
	const privatePageFetchRequests: string[] = [];

	page.on("request", (request) => {
		const url = request.url();
		if (url.includes("/api/v2/pages/") && !url.includes("/api/v2/pages/pv/")) {
			privatePageFetchRequests.push(url);
		}
	});

	await page.route("**/artalk-api/api/v2/comments/**", async (route) => {
		commentsRequests += 1;
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				comments: [],
				count: 0,
				roots_count: 0,
				page: {
					id: 101,
					key: "posts/test-pagination/pagination-test-01",
					site_name: "FangYuan",
					admin_only: false,
					pv: 108,
					vote_up: 12,
					vote_down: 0,
					title: "Crisp Signal 01",
					url: "http://127.0.0.1:4331/posts/test-pagination/pagination-test-01/",
				},
			}),
		});
	});

	await page.route("**/artalk-api/api/v2/votes/page/101/", async (route) => {
		pageVoteStatusRequests += 1;
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				up: 12,
				down: 0,
				is_up: false,
				is_down: false,
			}),
		});
	});

	await page.route("**/artalk-api/api/v2/votes/page/101/up/", async (route) => {
		pageVotePostRequests += 1;
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				up: 13,
				down: 0,
				is_up: true,
				is_down: false,
			}),
		});
	});

	await installSharedPageFeedbackApiMocks(page);

	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, PAGE_FEEDBACK_ROUTE);

	const likeButton = page.getByRole("button", { name: /点赞|Like/ }).first();
	await expect(likeButton).toContainText("12");
	await expect.poll(() => commentsRequests).toBe(1);
	await expect.poll(() => pageVoteStatusRequests).toBe(1);
	await expect(privatePageFetchRequests).toHaveLength(0);

	await page.getByRole("button", { name: /咖啡|打赏|Support|Coffee/ }).click();
	const rewardDialog = page.locator("dialog[open]");
	await expect(rewardDialog).toBeVisible();

	await page.getByRole("button", { name: "支付宝" }).click();
	await expect(rewardDialog.getByAltText(/支付宝|Alipay/i)).toBeVisible();
	await rewardDialog.getByRole("button", { name: /关闭|Close/ }).click();
	await expect(rewardDialog).toBeHidden();

	await likeButton.click();

	await expect(likeButton).toContainText("13");
	await expect(likeButton).toBeDisabled();
	await expect.poll(() => pageVotePostRequests).toBe(1);
	await expect.poll(() => commentsRequests).toBe(1);
	await expect(privatePageFetchRequests).toHaveLength(0);
});

test("reward modal stays centered and animated after swup navigation", async ({ page }) => {
	await page.route("**/artalk-api/api/v2/comments/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				comments: [],
				count: 0,
				roots_count: 0,
				page: {
					id: 101,
					key: "posts/test-pagination/pagination-test-01",
					site_name: "FangYuan",
					admin_only: false,
					pv: 108,
					vote_up: 12,
					vote_down: 0,
					title: "Crisp Signal 01",
					url: "http://127.0.0.1:4331/posts/test-pagination/pagination-test-01/",
				},
			}),
		});
	});
	await page.route("**/artalk-api/api/v2/votes/page/101/", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				up: 12,
				down: 0,
				is_up: false,
				is_down: false,
			}),
		});
	});
	await installSharedPageFeedbackApiMocks(page);
	await page.setViewportSize(VIEWPORTS.desktop);
	await page.addInitScript(() => {
		localStorage.setItem("theme", "light");
		localStorage.setItem("hue", "250");
	});

	await gotoAndWaitForApp(page, PAGE_FEEDBACK_ROUTE);

	await page.locator(`a[href="${PAGE_FEEDBACK_SWUP_ROUTE}"]`).first().click();
	await page.waitForURL(`**${PAGE_FEEDBACK_SWUP_ROUTE}`);
	await expect(page.locator("#swup-container")).toBeVisible();
	await page.waitForLoadState("networkidle");

	await page.getByRole("button", { name: /咖啡|打赏|Support|Coffee/ }).click();
	const rewardDialog = page.locator("dialog[open]");
	const rewardPanel = rewardDialog.locator(".feedback-dialog-panel");
	await expect(rewardDialog).toBeVisible();
	await expect(rewardPanel).toBeVisible();

	const dialogLayout = await rewardDialog.evaluate((element) => {
		const style = window.getComputedStyle(element);
		return {
			display: style.display,
			alignItems: style.alignItems,
			justifyContent: style.justifyContent,
		};
	});

	expect(dialogLayout).toEqual({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	});

	const panelAnimation = await rewardPanel.evaluate((element) => {
		const style = window.getComputedStyle(element);
		return {
			transitionProperty: style.transitionProperty,
			transitionDuration: style.transitionDuration,
		};
	});

	expect(panelAnimation.transitionProperty).toContain("transform");
	expect(panelAnimation.transitionDuration).not.toBe("0s");

	const panelBox = await rewardPanel.boundingBox();
	expect(panelBox).not.toBeNull();
	expect(panelBox!.x).toBeGreaterThan(280);
	expect(panelBox!.y).toBeGreaterThan(80);
});
