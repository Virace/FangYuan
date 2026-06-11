import { expect, test, type Page } from "@playwright/test";

type RewardRequestCounts = Map<string, number>;

async function watchRewardImageRequests(page: Page): Promise<RewardRequestCounts> {
	const counts: RewardRequestCounts = new Map();

	await page.route(
		/\/static\/(?:wechat|weixin_pay|alipay)\.[^/]+\.(?:jpg|jpeg|svg)$/,
		async (route) => {
			const request = route.request();
			const url = request.url();
			counts.set(url, (counts.get(url) ?? 0) + 1);
			await route.continue();
		},
	);

	return counts;
}

function collectRewardImageRequests(counts: RewardRequestCounts): number {
	return [...counts.values()].reduce((total, count) => total + count, 0);
}

async function waitForRewardRequests(counts: RewardRequestCounts, expected: number) {
	await expect
		.poll(() => collectRewardImageRequests(counts), { timeout: 5_000 })
		.toBe(expected);
}

test("reward tabs request each QR image once when switching", async ({ page }) => {
	const counts = await watchRewardImageRequests(page);

	await page.goto("/markdown/");
	await page.getByRole("button", { name: "请作者喝杯咖啡" }).click();
	await expect(page.getByRole("dialog")).toBeVisible();
	await expect(page.getByRole("img", { name: "微信打赏二维码" })).toBeVisible();
	await waitForRewardRequests(counts, 1);

	await page.getByRole("button", { name: "支付宝" }).click();
	await expect(page.getByRole("img", { name: "支付宝打赏二维码" })).toBeVisible();
	await waitForRewardRequests(counts, 2);

	await page.getByRole("button", { name: "微信" }).click();
	await expect(page.getByRole("img", { name: "微信打赏二维码" })).toBeVisible();
	await waitForRewardRequests(counts, 2);
});
