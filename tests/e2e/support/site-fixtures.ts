import { expect, type Page } from "@playwright/test";

const networkIsolationConfiguredPages = new WeakSet<Page>();
const MOCK_GITHUB_AVATAR =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='32' fill='%234b5563'/%3E%3Ctext x='32' y='38' font-size='24' text-anchor='middle' fill='white'%3EGH%3C/text%3E%3C/svg%3E";
const MOCK_EXTERNAL_IMAGE =
	"<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='#4b5563'/></svg>";

export const SITE_ROUTES = {
	// These baseline routes are only valid when the suite runs in internal mode.
	home: "/",
	about: "/about/",
	archive: "/archive/",
	postBasic: "/markdown/",
	postComplex: "/markdown-extended/",
	postWithCover: "/guide/",
} as const;

export const VIEWPORTS = {
	mobile: { width: 390, height: 844 },
	tablet: { width: 768, height: 1024 },
	desktop: { width: 1440, height: 900 },
} as const;

function buildGitHubRepoCardPayload(repoPath: string) {
	const [owner = "unknown", name = "repo"] = repoPath.split("/");

	return {
		description: `Mocked GitHub card for ${repoPath}`,
		language: "TypeScript",
		forks: 12,
		stargazers_count: 34,
		owner: {
			login: owner,
			avatar_url: MOCK_GITHUB_AVATAR,
		},
		license: {
			spdx_id: "MIT",
		},
		name,
		full_name: repoPath,
	};
}

async function installExternalNetworkStubs(page: Page): Promise<void> {
	if (networkIsolationConfiguredPages.has(page)) {
		return;
	}

	await page.route("**/*", async (route) => {
		const request = route.request();
		const url = new URL(request.url());

		if (
			!["http:", "https:"].includes(url.protocol) ||
			url.origin === "http://127.0.0.1:4331"
		) {
			await route.continue();
			return;
		}

		if (
			url.origin === "https://api.github.com" &&
			url.pathname.startsWith("/repos/")
		) {
			const repoPath = url.pathname.replace(/^\/repos\//, "");
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(buildGitHubRepoCardPayload(repoPath)),
			});
			return;
		}

		switch (request.resourceType()) {
			case "document":
				await route.fulfill({
					status: 200,
					contentType: "text/html",
					body: "<!doctype html><html><body>External embed stub</body></html>",
				});
				break;
			case "image":
				await route.fulfill({
					status: 200,
					contentType: "image/svg+xml",
					body: MOCK_EXTERNAL_IMAGE,
				});
				break;
			case "script":
				await route.fulfill({
					status: 200,
					contentType: "application/javascript",
					body: "",
				});
				break;
			case "stylesheet":
				await route.fulfill({
					status: 200,
					contentType: "text/css",
					body: "",
				});
				break;
			default:
				await route.fulfill({
					status: 204,
					body: "",
				});
		}
	});

	networkIsolationConfiguredPages.add(page);
}

function formatConsoleError(message: string, locationUrl: string): string {
	if (locationUrl) {
		return `${message} [${locationUrl}]`;
	}

	return message;
}

export function installConsoleErrorCollector(page: Page): string[] {
	const errors: string[] = [];

	page.on("console", (message) => {
		if (message.type() === "error") {
			errors.push(formatConsoleError(message.text(), message.location().url));
		}
	});

	page.on("pageerror", (error) => {
		errors.push(error.message);
	});

	return errors;
}

export async function gotoAndWaitForApp(
	page: Page,
	path: string,
): Promise<void> {
	await installExternalNetworkStubs(page);
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
	await expect(page.locator("#search-panel")).not.toHaveClass(
		/float-panel-closed/,
	);
}

export async function openMobileNavMenu(page: Page): Promise<void> {
	await page.getByRole("button", { name: "Menu" }).click();
	await expect(page.locator("#nav-menu-panel")).not.toHaveClass(
		/float-panel-closed/,
	);
}

export async function prepareStablePage(
	page: Page,
	path: string,
): Promise<void> {
	await page.addInitScript(() => {
		localStorage.setItem("theme", "light");
		localStorage.setItem("hue", "250");
	});

	await gotoAndWaitForApp(page, path);
	await disableMotion(page);
}
