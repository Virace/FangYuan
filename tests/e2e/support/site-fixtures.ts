import { expect, type Page } from "@playwright/test";

export const SITE_ROUTES = {
	home: "/",
	about: "/about/",
	archive: "/archive/",
	postBasic: "/posts/markdown/",
	postComplex: "/posts/markdown-extended/",
} as const;

export const VIEWPORTS = {
	mobile: { width: 390, height: 844 },
	tablet: { width: 768, height: 1024 },
	desktop: { width: 1440, height: 900 },
} as const;

export function installConsoleErrorCollector(page: Page): string[] {
	const errors: string[] = [];

	page.on("console", (message) => {
		if (message.type() === "error") {
			errors.push(message.text());
		}
	});

	page.on("pageerror", (error) => {
		errors.push(error.message);
	});

	return errors;
}

export async function gotoAndWaitForApp(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await expect(page.locator("#swup-container")).toBeVisible();
	await page.waitForLoadState("networkidle");
}

export async function disableMotion(page: Page): Promise<void> {
	await page.addStyleTag({
		content: `
			*,
			*::before,
			*::after {
				animation: none !important;
				transition: none !important;
				scroll-behavior: auto !important;
			}
		`,
	});
}

export async function waitForPagefind(page: Page): Promise<void> {
	await page.waitForFunction(() => {
		return typeof window !== "undefined" && !!window.pagefind;
	});
}

export async function openMobileSearchPanel(page: Page): Promise<void> {
	await page.getByRole("button", { name: "Search Panel" }).click();
	await expect(page.locator("#search-panel")).not.toHaveClass(/float-panel-closed/);
}

export async function openMobileNavMenu(page: Page): Promise<void> {
	await page.getByRole("button", { name: "Menu" }).click();
	await expect(page.locator("#nav-menu-panel")).not.toHaveClass(/float-panel-closed/);
}

export async function prepareStablePage(page: Page, path: string): Promise<void> {
	await page.addInitScript(() => {
		localStorage.setItem("theme", "light");
		localStorage.setItem("hue", "250");
	});

	await gotoAndWaitForApp(page, path);
	await disableMotion(page);
}
