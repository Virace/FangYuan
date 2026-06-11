import { expect, test } from "@playwright/test";

import { VIEWPORTS, prepareStablePage } from "./support/site-fixtures";

test("page feedback shows reward entry by default and keeps like gated by backend", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await prepareStablePage(page, "/wp/termux-ha-core/");

	const feedbackCard = page.locator("section").filter({
		hasText: "支持这篇文章",
	});

	await expect(feedbackCard).toBeVisible();
	const rewardButton = feedbackCard.getByRole("button", {
		name: "请作者喝杯咖啡",
	});
	await expect(rewardButton).toBeVisible();
	await expect(
		feedbackCard.getByRole("button", { name: /点赞|已点赞/ }),
	).toHaveCount(0);

	await rewardButton.click();
	await expect(page.getByRole("dialog")).toBeVisible();
	await expect(page.getByRole("img", { name: "微信打赏二维码" })).toBeVisible();
});
