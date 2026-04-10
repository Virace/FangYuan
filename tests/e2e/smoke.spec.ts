import { expect, test } from "@playwright/test";
import {
	SITE_ROUTES,
	gotoAndWaitForApp,
	installConsoleErrorCollector,
} from "./support/site-fixtures";

const smokeCases = [
	{
		name: "homepage shell",
		path: SITE_ROUTES.home,
		assertReady: (page) =>
			page.getByRole("link", { name: /Markdown Baseline Sample/i }).first(),
	},
	{
		name: "about page shell",
		path: SITE_ROUTES.about,
		assertReady: (page) => page.locator(".custom-md").first(),
	},
	{
		name: "archive page shell",
		path: SITE_ROUTES.archive,
		assertReady: (page) => page.getByText(/Markdown Baseline Sample/i).first(),
	},
	{
		name: "basic article shell",
		path: SITE_ROUTES.postBasic,
		assertReady: (page) =>
			page.locator("#post-container [data-pagefind-meta='title']"),
	},
	{
		name: "complex article shell",
		path: SITE_ROUTES.postComplex,
		assertReady: (page) =>
			page.locator("#post-container [data-pagefind-meta='title']"),
	},
] as const;

for (const smokeCase of smokeCases) {
	test(smokeCase.name, async ({ page }) => {
		const consoleErrors = installConsoleErrorCollector(page);

		await gotoAndWaitForApp(page, smokeCase.path);

		await expect(page).toHaveTitle(/FangYuan/i);
		await expect(smokeCase.assertReady(page)).toBeVisible();
		expect(consoleErrors).toEqual([]);
	});
}

test("homepage pagination does not render empty navigation links", async ({
	page,
}) => {
	await gotoAndWaitForApp(page, SITE_ROUTES.home);

	await expect(page.locator("a[href='']")).toHaveCount(0);
});
