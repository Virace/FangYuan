import { expect, test, type Page } from "@playwright/test";
import { SITE_ROUTES, gotoAndWaitForApp } from "./support/site-fixtures";

const repo = "Fabrizz/MMM-OnSpotify";
const cardSelector = `a.card-github[data-github-repo="${repo}"]`;
const apiPattern = "https://api.github.com/repos/**";

function payload(overrides: Record<string, unknown> = {}) {
	return {
		full_name: repo, private: false, visibility: "public",
		description: "Live repository description", language: "JavaScript",
		stargazers_count: 56, forks_count: 7,
		license: { spdx_id: "MIT" }, owner: { avatar_url: "https://avatars.githubusercontent.com/u/1?v=4" },
		...overrides,
	};
}

async function preparePage(page: Page): Promise<void> {
	await gotoAndWaitForApp(page, SITE_ROUTES.home);
}

test("GitHub snapshot is readable and linked with JavaScript disabled", async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL: "http://127.0.0.1:4331" });
	const page = await context.newPage();
	await page.route("https://**/*", route => route.abort());
	await page.goto(SITE_ROUTES.postComplex);
	const card = page.locator(cardSelector);
	await expect(card).toHaveAttribute("href", `https://github.com/${repo}`);
	await expect(card.locator(".gc-description")).toHaveText(`Built snapshot for ${repo}`);
	await expect(card.locator(".gc-stars")).toHaveText("123");
	await expect(card).toBeVisible();
	await context.close();
});

for (const status of [403, 429]) {
	test(`GitHub HTTP ${status} keeps the build snapshot and completes refresh`, async ({ page }) => {
		await preparePage(page);
		await page.route(apiPattern, route => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ message: "API rate limit exceeded" }) }));
		await page.goto(SITE_ROUTES.postComplex);
		const card = page.locator(cardSelector);
		await expect(card).toHaveAttribute("data-github-state", "stale");
		await expect(card).not.toHaveAttribute("aria-busy");
		await expect(card.locator(".gc-description")).toHaveText(`Built snapshot for ${repo}`);
		await expect(card.locator(".gc-stars")).toHaveText("123");
		await expect(card).toHaveCSS("pointer-events", "auto");
		await expect(card.locator(".gc-status")).toHaveText("数据可能滞后，请进入仓库查看。");
	});
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test(`GitHub stale notice follows card expansion with motion ${reducedMotion}`, async ({ page }, testInfo) => {
		await page.emulateMedia({ reducedMotion });
		if (reducedMotion === "reduce") {
			await page.setViewportSize({ width: 390, height: 844 });
			await page.emulateMedia({ colorScheme: "dark" });
		}
		await preparePage(page);
		let releaseRequest: (() => void) | undefined;
		await page.route(apiPattern, async route => {
			await new Promise<void>(resolve => { releaseRequest = resolve; });
			await route.fulfill({ status: 403, contentType: "application/json", body: "{}" });
		});
		await page.goto(SITE_ROUTES.postComplex);
		const card = page.locator(cardSelector);
		await expect(card).toHaveAttribute("data-github-state", "updating");
		await card.scrollIntoViewIfNeeded();
		const initialHeight = await card.evaluate(element => element.getBoundingClientRect().height);
		const framesPromise = card.evaluate(element => new Promise<{ height: number; opacity: number; stars: string | null }[]>(resolve => {
			const frames: { height: number; opacity: number; stars: string | null }[] = [];
			const observer = new MutationObserver(() => {
				if (element.getAttribute("data-github-state") !== "stale") return;
				observer.disconnect();
				const sample = () => {
					frames.push({
						height: element.getBoundingClientRect().height,
						opacity: Number(getComputedStyle(element.querySelector<HTMLElement>(".gc-status")!).opacity),
						stars: element.querySelector(".gc-stars")!.textContent,
					});
					if (element.getAnimations({ subtree: true }).some(animation => animation.playState === "running")) requestAnimationFrame(sample);
					else resolve(frames);
				};
				sample();
			});
			observer.observe(element, { attributes: true, attributeFilter: ["data-github-state"] });
			element.setAttribute("data-test-observing", "true");
		}));
		await expect(card).toHaveAttribute("data-test-observing", "true");
		await expect.poll(() => typeof releaseRequest).toBe("function");
		releaseRequest!();
		const frames = await framesPromise;
		const finalHeight = frames.at(-1)!.height;
		expect(finalHeight).toBeGreaterThan(initialHeight);
		expect(frames.every(frame => frame.stars === "123")).toBe(true);
		expect(frames.at(-1)!.opacity).toBe(1);
		if (reducedMotion === "no-preference") {
			expect(frames[0].opacity).toBe(0);
			expect(frames.some(frame => frame.height > initialHeight + 0.5 && frame.height < finalHeight - 0.5)).toBe(true);
			expect(frames.filter(frame => frame.height < finalHeight - 0.5).every(frame => frame.opacity === 0)).toBe(true);
		} else {
			expect(frames).toHaveLength(1);
		}
		await expect(card.locator(".gc-status-icon")).toBeVisible();
		await expect(card.locator(".gc-language")).toHaveText("TypeScript");
		await card.screenshot({ path: testInfo.outputPath("github-card-stale.png") });
	});
}

test("GitHub hanging request ends within its timeout while the snapshot stays usable", async ({ page }) => {
	await preparePage(page);
	await page.route(apiPattern, () => {});
	await page.goto(SITE_ROUTES.postComplex);
	const card = page.locator(cardSelector);
	await expect(card).toHaveAttribute("data-github-state", "updating");
	await expect(card.locator(".gc-description")).toBeVisible();
	await expect(card).toHaveAttribute("href", `https://github.com/${repo}`);
	await expect(card).toHaveAttribute("data-github-state", "stale", { timeout: 8_000 });
	await expect(card).not.toHaveAttribute("aria-busy");
	await expect(card.locator(".gc-stars")).toHaveText("123");
});

test("GitHub successful null and zero clear stale fields and update a renamed repository", async ({ page }) => {
	await preparePage(page);
	await page.route(apiPattern, route => route.fulfill({ contentType: "application/json", body: JSON.stringify(payload({ full_name: "NewOwner/Renamed", description: null, language: null, license: null, owner: null, stargazers_count: 0, forks_count: 0 })) }));
	await page.goto(SITE_ROUTES.postComplex);
	const card = page.locator(cardSelector);
	await expect(card).toHaveAttribute("data-github-state", "ready");
	await expect(card).toHaveAttribute("href", "https://github.com/NewOwner/Renamed");
	await expect(card.locator(".gc-user")).toHaveText("NewOwner");
	await expect(card.locator(".gc-repo")).toHaveText("Renamed");
	await expect(card.locator(".gc-description")).toBeHidden();
	await expect(card.locator(".gc-license")).toBeHidden();
	await expect(card.locator(".gc-language")).toBeHidden();
	await expect(card.locator(".gc-avatar")).toBeHidden();
	await expect(card.locator(".gc-stars")).toHaveText("0");
	await expect(card.locator(".gc-forks")).toHaveText("0");
});

test("duplicate GitHub cards share one background request", async ({ page }) => {
	await preparePage(page);
	await page.route("**/markdown-extended/", async route => {
		const response = await route.fetch();
		const html = await response.text();
		const cardHtml = html.match(/<a\b[^>]*data-github-repo="Fabrizz\/MMM-OnSpotify"[\s\S]*?<\/a>/)?.[0];
		expect(cardHtml).toBeTruthy();
		await route.fulfill({ response, body: html.replace(cardHtml!, cardHtml! + cardHtml!) });
	});
	let requests = 0;
	await page.route(apiPattern, async route => {
		if (route.request().url().endsWith(repo)) requests += 1;
		await route.fulfill({ contentType: "application/json", body: JSON.stringify(payload()) });
	});
	await page.goto(SITE_ROUTES.postComplex);
	await expect(page.locator(cardSelector)).toHaveCount(2);
	await expect(page.locator(`${cardSelector}[data-github-state="ready"]`)).toHaveCount(2);
	expect(requests).toBe(1);
});

test("Swup cancels old GitHub responses and refreshes the page after returning", async ({ page }) => {
	await preparePage(page);
	let releaseOld: (() => void) | undefined;
	let firstRequest = true;
	await page.route(apiPattern, async route => {
		if (route.request().url().endsWith(repo) && firstRequest) {
			firstRequest = false;
			await new Promise<void>(resolve => { releaseOld = resolve; });
			await route.fulfill({ contentType: "application/json", body: JSON.stringify(payload({ description: "Obsolete response" })) }).catch(() => {});
			return;
		}
		await route.fulfill({ contentType: "application/json", body: JSON.stringify(payload({ description: "Current response" })) });
	});
	await page.goto(SITE_ROUTES.postComplex);
	await expect(page.locator(cardSelector)).toHaveAttribute("data-github-state", "updating");
	await expect.poll(() => typeof releaseOld).toBe("function");
	await page.locator('#navbar a[href="/archive/"]').first().click();
	await page.waitForURL("**/archive/");
	await page.locator(`a[href="${SITE_ROUTES.postComplex}"]`).first().click();
	await page.waitForURL("**/markdown-extended/");
	await expect(page.locator(cardSelector)).toHaveAttribute("data-github-state", "ready");
	await expect(page.locator(`${cardSelector} .gc-description`)).toHaveText("Current response");
	releaseOld!();
	await expect(page.locator(`${cardSelector} .gc-description`)).toHaveText("Current response");
});
