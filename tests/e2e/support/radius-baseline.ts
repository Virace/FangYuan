import { expect, type Locator, type Page } from "@playwright/test";

import {
	clampRadiusLevel,
	DEFAULT_RADIUS_LEVEL,
	RADIUS_LEVEL_SCALE_MAP,
} from "../../../src/constants/theme-radius";
import {
	SITE_ROUTES,
	VIEWPORTS,
	openMobileNavMenu,
	openMobileSearchPanel,
	prepareStablePageWithRadius,
	waitForPagefind,
} from "./site-fixtures";
import { RADIUS_REFERENCE_BASELINE } from "./radius-baseline.reference";

const WIDE_DESKTOP_VIEWPORT = { width: 1600, height: 900 } as const;

export type RadiusSourceReference = {
	id: string;
	sourceKind: "fuwari" | "fangyuan-pre-theme";
	sourcePath: string;
	sourceRadius: string;
	baselineUnit?: "rem16px" | "px";
	runtimeCovered: boolean;
	coverageNote?: string;
};

export const RADIUS_SOURCE_REFERENCES: RadiusSourceReference[] = [
	{
		id: "fuwari-navbar-home-link",
		sourceKind: "fuwari",
		sourcePath: "src/components/Navbar.astro:28",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-navbar-nav-link",
		sourceKind: "fuwari",
		sourcePath: "src/components/Navbar.astro:37",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-navbar-display-settings-trigger",
		sourceKind: "fuwari",
		sourcePath: "src/components/Navbar.astro:50",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-navbar-mobile-menu-trigger",
		sourceKind: "fuwari",
		sourcePath: "src/components/Navbar.astro:55",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-light-dark-switch-trigger",
		sourceKind: "fuwari",
		sourcePath: "src/components/LightDarkSwitch.svelte:62",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-light-dark-panel-option",
		sourceKind: "fuwari",
		sourcePath: "src/components/LightDarkSwitch.svelte:76",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-search-desktop-shell",
		sourceKind: "fuwari",
		sourcePath: "src/components/Search.svelte:142",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-search-mobile-trigger",
		sourceKind: "fuwari",
		sourcePath: "src/components/Search.svelte:155",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-search-panel-shell",
		sourceKind: "fuwari",
		sourcePath: "src/components/Search.svelte:161",
		sourceRadius: "rounded-2xl",
		runtimeCovered: true,
	},
	{
		id: "fuwari-search-mobile-input-shell",
		sourceKind: "fuwari",
		sourcePath: "src/components/Search.svelte:164",
		sourceRadius: "rounded-xl",
		runtimeCovered: true,
	},
	{
		id: "fuwari-search-result-link",
		sourceKind: "fuwari",
		sourcePath: "src/components/Search.svelte:179",
		sourceRadius: "rounded-xl",
		runtimeCovered: true,
	},
	{
		id: "fuwari-float-panel-shell",
		sourceKind: "fuwari",
		sourcePath: "src/styles/main.css:24",
		sourceRadius: "rounded-[var(--radius-large)]",
		runtimeCovered: true,
	},
	{
		id: "fuwari-nav-menu-panel-link",
		sourceKind: "fuwari",
		sourcePath: "src/components/widget/NavMenuPanel.astro:14",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-profile-about-link",
		sourceKind: "fuwari",
		sourcePath: "src/components/widget/Profile.astro:12",
		sourceRadius: "rounded-xl",
		runtimeCovered: true,
	},
	{
		id: "fuwari-profile-social-link",
		sourceKind: "fuwari",
		sourcePath: "src/components/widget/Profile.astro:27",
		sourceRadius: "rounded-lg",
		runtimeCovered: false,
		coverageNote: "默认 demo 配置没有 profile links，运行时不存在该节点。",
	},
	{
		id: "fuwari-widget-more-button",
		sourceKind: "fuwari",
		sourcePath: "src/components/widget/WidgetLayout.astro:25",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-categories-button",
		sourceKind: "fuwari",
		sourcePath: "src/components/control/ButtonLink.astro:14",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-categories-badge",
		sourceKind: "fuwari",
		sourcePath: "src/components/control/ButtonLink.astro:34",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-tag-chip",
		sourceKind: "fuwari",
		sourcePath: "src/components/control/ButtonTag.astro:10",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-tag-dot",
		sourceKind: "fuwari",
		sourcePath: "src/components/control/ButtonTag.astro:11",
		sourceRadius: "rounded-md",
		runtimeCovered: false,
		coverageNote: "默认 tags widget 没有传 dot，运行时不存在该节点。",
	},
	{
		id: "fuwari-footer-shell",
		sourceKind: "fuwari",
		sourcePath: "src/components/Footer.astro:12",
		sourceRadius: "rounded-2xl",
		runtimeCovered: true,
	},
	{
		id: "fuwari-inline-link",
		sourceKind: "fuwari",
		sourcePath: "src/styles/main.css:18",
		sourceRadius: ".link rounded-md",
		runtimeCovered: true,
	},
	{
		id: "fuwari-about-panel",
		sourceKind: "fuwari",
		sourcePath: "src/pages/about.astro:18",
		sourceRadius: "rounded-[var(--radius-large)]",
		runtimeCovered: true,
	},
	{
		id: "fuwari-archive-row-link",
		sourceKind: "fuwari",
		sourcePath: "src/components/ArchivePanel.svelte:110",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-pagination-button",
		sourceKind: "fuwari",
		sourcePath: "src/components/control/Pagination.astro:56",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-pagination-current",
		sourceKind: "fuwari",
		sourcePath: "src/components/control/Pagination.astro:67",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-post-panel",
		sourceKind: "fuwari",
		sourcePath: "src/pages/posts/[...slug].astro:50",
		sourceRadius: "rounded-[var(--radius-large)]",
		runtimeCovered: true,
	},
	{
		id: "fuwari-post-word-icon",
		sourceKind: "fuwari",
		sourcePath: "src/pages/posts/[...slug].astro:57",
		sourceRadius: "rounded-md",
		runtimeCovered: true,
	},
	{
		id: "fuwari-post-reading-icon",
		sourceKind: "fuwari",
		sourcePath: "src/pages/posts/[...slug].astro:63",
		sourceRadius: "rounded-md",
		runtimeCovered: true,
	},
	{
		id: "fuwari-post-meta-icon",
		sourceKind: "fuwari",
		sourcePath: "src/styles/main.css:97",
		sourceRadius: ".meta-icon rounded-md",
		runtimeCovered: true,
	},
	{
		id: "fuwari-post-meta-link",
		sourceKind: "fuwari",
		sourcePath: "src/styles/main.css:21",
		sourceRadius: ".link-lg rounded-md",
		runtimeCovered: true,
	},
	{
		id: "fuwari-post-cover",
		sourceKind: "fuwari",
		sourcePath: "src/pages/posts/[...slug].astro:101",
		sourceRadius: "rounded-xl",
		runtimeCovered: false,
		coverageNote: "当前 demo 内容没有 cover-enabled post route。",
	},
	{
		id: "fuwari-license-shell",
		sourceKind: "fuwari",
		sourcePath: "src/pages/posts/[...slug].astro:109",
		sourceRadius: "rounded-xl",
		runtimeCovered: true,
	},
	{
		id: "fuwari-post-nav-card",
		sourceKind: "fuwari",
		sourcePath: "src/pages/posts/[...slug].astro:117",
		sourceRadius: "rounded-2xl",
		runtimeCovered: true,
	},
	{
		id: "fuwari-toc-link",
		sourceKind: "fuwari",
		sourcePath: "src/components/widget/TOC.astro:37",
		sourceRadius: "rounded-xl",
		runtimeCovered: true,
	},
	{
		id: "fuwari-toc-badge",
		sourceKind: "fuwari",
		sourcePath: "src/components/widget/TOC.astro:40",
		sourceRadius: "rounded-lg",
		runtimeCovered: true,
	},
	{
		id: "fuwari-toc-depth-dot",
		sourceKind: "fuwari",
		sourcePath: "src/components/widget/TOC.astro:49",
		sourceRadius: "rounded-[0.1875rem]",
		runtimeCovered: false,
		coverageNote: "当前 demo route 的 heading 深度不稳定，不保证始终存在该节点。",
	},
	{
		id: "fuwari-toc-active-indicator",
		sourceKind: "fuwari",
		sourcePath: "src/components/widget/TOC.astro:58",
		sourceRadius: "rounded-xl",
		runtimeCovered: true,
	},
	{
		id: "fuwari-back-to-top-shell",
		sourceKind: "fuwari",
		sourcePath: "src/components/control/BackToTop.astro:7",
		sourceRadius: "rounded-2xl",
		runtimeCovered: true,
	},
	{
		id: "fuwari-custom-markdown-link",
		sourceKind: "fuwari",
		sourcePath: "src/styles/markdown.css:50",
		sourceRadius: "border-radius: 0.375rem",
		runtimeCovered: false,
		coverageNote: "当前 demo fixture 没有稳定的 markdown sandbox route。",
	},
	{
		id: "fuwari-inline-code",
		sourceKind: "fuwari",
		sourcePath: "src/styles/markdown.css:116",
		sourceRadius: "border-radius: 0.375rem",
		runtimeCovered: false,
		coverageNote: "当前 demo fixture 没有稳定的 inline-code baseline route。",
	},
	{
		id: "fuwari-copy-button",
		sourceKind: "fuwari",
		sourcePath: "src/styles/markdown.css:154",
		sourceRadius: "border-radius: 0.5rem",
		runtimeCovered: false,
		coverageNote: "当前 demo fixture 没有稳定的 expressive-code baseline route。",
	},
	{
		id: "fuwari-photoswipe-button",
		sourceKind: "fuwari",
		sourcePath: "src/styles/photoswipe.css:25",
		sourceRadius: "border-radius: 0.75rem",
		runtimeCovered: false,
		coverageNote: "当前 demo 内容没有稳定的 cover-enabled route。",
	},
	{
		id: "fangyuan-pre-theme-reward-modal-shell",
		sourceKind: "fangyuan-pre-theme",
		sourcePath: "src/components/page-feedback/RewardModal.svelte:193",
		sourceRadius: "rounded-[1.75rem]",
		runtimeCovered: true,
	},
	{
		id: "fangyuan-pre-theme-reward-modal-panel",
		sourceKind: "fangyuan-pre-theme",
		sourcePath: "src/components/page-feedback/RewardModal.svelte:195",
		sourceRadius: "rounded-[1.25rem]",
		runtimeCovered: true,
	},
];

export type RadiusBaselineTarget = {
	referenceId: RadiusSourceReference["id"];
	label: string;
	path: string;
	viewport: { width: number; height: number };
	basePx: number;
	navigationKey: string;
	locate: (page: Page) => Locator;
	referenceLocate?: (page: Page) => Locator;
	prepare?: (page: Page) => Promise<void>;
	referencePrepare?: (page: Page) => Promise<void>;
};

export type RadiusReferenceBaselineEntry = {
	targetKey: string;
	referenceId: RadiusSourceReference["id"];
	label: string;
	path: string;
	navigationKey: string;
	viewport: { width: number; height: number };
	radiusPx: string;
	sourcePath: string;
	sourceRadius: string;
};

function getReference(referenceId: RadiusSourceReference["id"]) {
	const reference = RADIUS_SOURCE_REFERENCES.find((item) => item.id === referenceId);
	if (!reference) {
		throw new Error(`Unknown radius source reference: ${referenceId}`);
	}
	return reference;
}

export function getRadiusTargetKey(target: RadiusBaselineTarget) {
	return `${target.referenceId}::${target.navigationKey}::${target.label}`;
}

async function openRewardModal(page: Page) {
	const modalPanel = page.locator(".feedback-dialog-panel");
	if (await modalPanel.isVisible()) {
		return;
	}
	await page
		.getByRole("button", {
			name: /请作者喝杯咖啡|Buy the author a coffee/,
		})
		.click();
	await expect(modalPanel).toBeVisible();
}

async function ensureDisplaySettingsOpen(page: Page) {
	const panel = page.locator("#display-setting");
	if (await panel.evaluate((node) => !node.classList.contains("float-panel-closed"))) {
		return;
	}
	await page.getByRole("button", { name: "Display Settings" }).click();
	await expect(panel).not.toHaveClass(/float-panel-closed/);
}

async function ensureThemePanelOpen(page: Page) {
	const panelWrapper = page.locator("#light-dark-panel");
	if (
		await panelWrapper.evaluate(
			(node) => !node.classList.contains("float-panel-closed"),
		)
	) {
		return;
	}
	await page.locator("#scheme-switch").hover();
	await expect(panelWrapper).not.toHaveClass(/float-panel-closed/);
}

async function ensureMobileSearchResults(page: Page) {
	await waitForPagefind(page);
	const panel = page.locator("#search-panel");
	if (await panel.evaluate((node) => !node.classList.contains("float-panel-closed"))) {
		await page.locator("#search-bar-inside input").fill("Markdown");
	} else {
		await openMobileSearchPanel(page);
		await page.locator("#search-bar-inside input").fill("Markdown");
	}
	await expect(page.locator("#search-panel a").first()).toBeVisible();
}

async function ensureMobileSearchPanelOpen(page: Page) {
	const panel = page.locator("#search-panel");
	if (await panel.evaluate((node) => !node.classList.contains("float-panel-closed"))) {
		return;
	}
	await openMobileSearchPanel(page);
}

async function ensureMobileNavPanelOpen(page: Page) {
	const panel = page.locator("#nav-menu-panel");
	if (await panel.evaluate((node) => !node.classList.contains("float-panel-closed"))) {
		return;
	}
	await page.locator("#nav-menu-switch").click();
	await expect(panel).not.toHaveClass(/float-panel-closed/);
}

async function ensureWideTocReady(page: Page) {
	await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
	await expect(page.locator("#toc-wrapper")).not.toHaveClass(/toc-hide|toc-not-ready/);
	await expect(page.locator("#toc a").first()).toBeVisible();
}

async function ensureBackToTopVisible(page: Page) {
	await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" }));
	await expect(page.locator("#back-to-top-btn")).not.toHaveClass(/hide/);
}

export const RUNTIME_RADIUS_BASELINE_TARGETS: RadiusBaselineTarget[] = [
	{
		referenceId: "fuwari-navbar-home-link",
		label: "desktop navbar home link",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "home-desktop-base",
		locate: (page) => page.locator("#navbar > div a[href='/']").first(),
	},
	{
		referenceId: "fuwari-navbar-nav-link",
		label: "desktop navbar nav link",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "home-desktop-base",
		locate: (page) => page.locator("#navbar .hidden.md\\:flex a").first(),
	},
	{
		referenceId: "fuwari-navbar-display-settings-trigger",
		label: "display settings trigger",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "home-desktop-base",
		locate: (page) => page.locator("#display-settings-switch"),
	},
	{
		referenceId: "fuwari-light-dark-switch-trigger",
		label: "light dark trigger",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "home-desktop-base",
		locate: (page) => page.locator("#scheme-switch"),
	},
	{
		referenceId: "fuwari-search-desktop-shell",
		label: "desktop search shell",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "home-desktop-base",
		locate: (page) => page.locator("#search-bar"),
	},
	{
		referenceId: "fuwari-profile-about-link",
		label: "sidebar about image link",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 12,
		navigationKey: "home-desktop-base",
		locate: (page) => page.getByRole("link", { name: "Go to About Page" }),
	},
	{
		referenceId: "fuwari-categories-button",
		label: "categories widget button",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "home-desktop-base",
		locate: (page) =>
			page.locator("widget-layout[data-id='categories'] a button").first(),
	},
	{
		referenceId: "fuwari-categories-badge",
		label: "categories widget badge",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "home-desktop-base",
		locate: (page) =>
			page
				.locator("widget-layout[data-id='categories'] a button div.rounded-control")
				.first(),
		referenceLocate: (page) =>
			page
				.locator("widget-layout[data-id='categories'] a button > div > div")
				.nth(1),
	},
	{
		referenceId: "fuwari-tag-chip",
		label: "tags widget chip",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "home-desktop-base",
		locate: (page) =>
			page.locator("widget-layout[data-id='tags'] a.btn-regular").first(),
	},
	{
		referenceId: "fuwari-widget-more-button",
		label: "widget expand button",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "home-desktop-base",
		locate: (page) =>
			page.locator(
				"widget-layout[data-id='categories'] .expand-btn button.btn-plain",
			),
	},
	{
		referenceId: "fuwari-footer-shell",
		label: "footer shell",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 16,
		navigationKey: "home-desktop-base",
		locate: (page) =>
			page.locator("div.rounded-2xl.border-dashed.border-footer-divider").first(),
	},
	{
		referenceId: "fuwari-inline-link",
		label: "footer rss link",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 6,
		navigationKey: "home-desktop-base",
		locate: (page) => page.locator("a[href$='rss.xml']").first(),
	},
	{
		referenceId: "fuwari-search-mobile-trigger",
		label: "mobile search trigger",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.mobile,
		basePx: 8,
		navigationKey: "home-mobile-base",
		locate: (page) => page.locator("#search-switch"),
	},
	{
		referenceId: "fuwari-search-panel-shell",
		label: "mobile search panel shell",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.mobile,
		basePx: 16,
		navigationKey: "home-mobile-search",
		prepare: ensureMobileSearchResults,
		referencePrepare: ensureMobileSearchPanelOpen,
		locate: (page) => page.locator("#search-panel"),
	},
	{
		referenceId: "fuwari-search-mobile-input-shell",
		label: "mobile search input shell",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.mobile,
		basePx: 12,
		navigationKey: "home-mobile-search",
		prepare: ensureMobileSearchResults,
		referencePrepare: ensureMobileSearchPanelOpen,
		locate: (page) => page.locator("#search-bar-inside"),
	},
	{
		referenceId: "fuwari-search-result-link",
		label: "mobile search result link",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.mobile,
		basePx: 12,
		navigationKey: "home-mobile-search",
		prepare: ensureMobileSearchResults,
		referencePrepare: ensureMobileSearchPanelOpen,
		locate: (page) => page.locator("#search-panel a").first(),
	},
	{
		referenceId: "fuwari-float-panel-shell",
		label: "mobile nav panel shell",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.mobile,
		basePx: 16,
		navigationKey: "home-mobile-nav",
		prepare: ensureMobileNavPanelOpen,
		locate: (page) => page.locator("#nav-menu-panel"),
	},
	{
		referenceId: "fuwari-nav-menu-panel-link",
		label: "mobile nav panel link",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.mobile,
		basePx: 8,
		navigationKey: "home-mobile-nav",
		prepare: ensureMobileNavPanelOpen,
		locate: (page) => page.locator("#nav-menu-panel a").first(),
	},
	{
		referenceId: "fuwari-float-panel-shell",
		label: "display settings panel shell",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 16,
		navigationKey: "home-display-settings",
		prepare: ensureDisplaySettingsOpen,
		locate: (page) => page.locator("#display-setting"),
	},
	{
		referenceId: "fuwari-float-panel-shell",
		label: "light dark panel shell",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 16,
		navigationKey: "home-theme-panel",
		prepare: ensureThemePanelOpen,
		locate: (page) => page.locator("#light-dark-panel .float-panel"),
	},
	{
		referenceId: "fuwari-light-dark-panel-option",
		label: "light dark panel option",
		path: SITE_ROUTES.home,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "home-theme-panel",
		prepare: ensureThemePanelOpen,
		locate: (page) => page.locator("#light-dark-panel button").first(),
	},
	{
		referenceId: "fuwari-about-panel",
		label: "about page main shell",
		path: SITE_ROUTES.about,
		viewport: VIEWPORTS.desktop,
		basePx: 16,
		navigationKey: "about-desktop-base",
		locate: (page) => page.locator("main .rounded-panel").first(),
	},
	{
		referenceId: "fuwari-archive-row-link",
		label: "archive row link",
		path: SITE_ROUTES.archive,
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "archive-desktop-base",
		locate: (page) => page.locator("a.group.btn-plain").first(),
	},
	{
		referenceId: "fuwari-pagination-button",
		label: "archive pagination button",
		path: "/2/",
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "archive-page2",
		locate: (page) => page.locator("a[aria-label='Page 1']").first(),
	},
	{
		referenceId: "fuwari-pagination-current",
		label: "archive current page chip",
		path: "/2/",
		viewport: VIEWPORTS.desktop,
		basePx: 8,
		navigationKey: "archive-page2",
		locate: (page) => page.locator("div.h-11.w-11.rounded-control.bg-primary").first(),
		referenceLocate: (page) =>
			page.locator("div.h-11.w-11.bg-primary").filter({ hasText: /^2$/ }).first(),
	},
	{
		referenceId: "fuwari-post-panel",
		label: "post page main shell",
		path: SITE_ROUTES.postBasic,
		viewport: VIEWPORTS.desktop,
		basePx: 16,
		navigationKey: "post-desktop-base",
		locate: (page) => page.locator("#post-container").locator("xpath=.."),
	},
	{
		referenceId: "fuwari-post-word-icon",
		label: "post word count icon",
		path: SITE_ROUTES.postBasic,
		viewport: VIEWPORTS.desktop,
		basePx: 6,
		navigationKey: "post-desktop-base",
		locate: (page) => page.locator("#post-container .bg-soft-contrast").first(),
	},
	{
		referenceId: "fuwari-post-reading-icon",
		label: "post reading time icon",
		path: SITE_ROUTES.postBasic,
		viewport: VIEWPORTS.desktop,
		basePx: 6,
		navigationKey: "post-desktop-base",
		locate: (page) => page.locator("#post-container .bg-soft-contrast").nth(1),
	},
	{
		referenceId: "fuwari-post-meta-icon",
		label: "post metadata icon",
		path: SITE_ROUTES.postBasic,
		viewport: VIEWPORTS.desktop,
		basePx: 6,
		navigationKey: "post-desktop-base",
		locate: (page) => page.locator(".meta-icon").first(),
	},
	{
		referenceId: "fuwari-post-meta-link",
		label: "post metadata link",
		path: SITE_ROUTES.postBasic,
		viewport: VIEWPORTS.desktop,
		basePx: 6,
		navigationKey: "post-desktop-base",
		locate: (page) => page.locator("#post-container a.link-lg").first(),
	},
	{
		referenceId: "fuwari-license-shell",
		label: "license block shell",
		path: SITE_ROUTES.postBasic,
		viewport: VIEWPORTS.desktop,
		basePx: 12,
		navigationKey: "post-desktop-base",
		locate: (page) => page.locator(".license-container").first(),
	},
	{
		referenceId: "fuwari-post-nav-card",
		label: "post navigation card",
		path: SITE_ROUTES.postBasic,
		viewport: VIEWPORTS.desktop,
		basePx: 16,
		navigationKey: "post-desktop-base",
		locate: (page) => page.locator(".btn-card.rounded-2xl").first(),
	},
	{
		referenceId: "fuwari-toc-link",
		label: "toc link",
		path: SITE_ROUTES.postBasic,
		viewport: WIDE_DESKTOP_VIEWPORT,
		basePx: 12,
		navigationKey: "post-wide-toc",
		prepare: ensureWideTocReady,
		locate: (page) => page.locator("#toc a").first(),
	},
	{
		referenceId: "fuwari-toc-badge",
		label: "toc badge",
		path: SITE_ROUTES.postBasic,
		viewport: WIDE_DESKTOP_VIEWPORT,
		basePx: 8,
		navigationKey: "post-wide-toc",
		prepare: ensureWideTocReady,
		locate: (page) => page.locator("#toc a div.rounded-lg").first(),
	},
	{
		referenceId: "fuwari-toc-active-indicator",
		label: "toc active indicator",
		path: SITE_ROUTES.postBasic,
		viewport: WIDE_DESKTOP_VIEWPORT,
		basePx: 12,
		navigationKey: "post-wide-toc",
		prepare: ensureWideTocReady,
		locate: (page) => page.locator("#active-indicator"),
	},
	{
		referenceId: "fuwari-back-to-top-shell",
		label: "back to top shell",
		path: SITE_ROUTES.postBasic,
		viewport: VIEWPORTS.desktop,
		basePx: 16,
		navigationKey: "post-back-to-top",
		prepare: ensureBackToTopVisible,
		locate: (page) => page.locator("#back-to-top-btn"),
	},
	{
		referenceId: "fangyuan-pre-theme-reward-modal-shell",
		label: "reward modal outer shell",
		path: SITE_ROUTES.postBasic,
		viewport: VIEWPORTS.desktop,
		basePx: 28,
		navigationKey: "post-reward-modal",
		prepare: openRewardModal,
		locate: (page) => page.locator(".feedback-dialog-panel > div.px-6.py-6 > div.rounded-dialog-shell").first(),
	},
	{
		referenceId: "fangyuan-pre-theme-reward-modal-panel",
		label: "reward modal inner panel",
		path: SITE_ROUTES.postBasic,
		viewport: VIEWPORTS.desktop,
		basePx: 20,
		navigationKey: "post-reward-modal",
		prepare: openRewardModal,
		locate: (page) => page.locator(".feedback-dialog-panel .rounded-dialog-panel").first(),
	},
];

function formatPx(value: number) {
	const normalized = Number(value.toFixed(3));
	return `${normalized}px`;
}

function getExpectedRadiusPx(
	basePx: number,
	level: number,
	rootFontSizePx: number,
	unit: "rem16px" | "px" = "rem16px",
) {
	const resolvedLevel = clampRadiusLevel(level, DEFAULT_RADIUS_LEVEL);
	const scale =
		RADIUS_LEVEL_SCALE_MAP[resolvedLevel] ??
		RADIUS_LEVEL_SCALE_MAP[DEFAULT_RADIUS_LEVEL];
	const unitScale = unit === "rem16px" ? rootFontSizePx / 16 : 1;
	return formatPx(basePx * unitScale * scale);
}

function getScaledRadiusPxFromMeasuredBaseline(measuredPx: number, level: number) {
	const resolvedLevel = clampRadiusLevel(level, DEFAULT_RADIUS_LEVEL);
	const scale =
		RADIUS_LEVEL_SCALE_MAP[resolvedLevel] ??
		RADIUS_LEVEL_SCALE_MAP[DEFAULT_RADIUS_LEVEL];
	return formatPx(measuredPx * scale);
}

function sameViewport(
	left: { width: number; height: number },
	right: { width: number; height: number },
) {
	return left.width === right.width && left.height === right.height;
}

export async function assertRadiusBaseline(
	page: Page,
	level: number,
	targets: RadiusBaselineTarget[] = RUNTIME_RADIUS_BASELINE_TARGETS,
) {
	let currentPath = "";
	let currentViewport = VIEWPORTS.desktop;
	let currentNavigationKey = "";
	let currentRootFontSizePx = 16;

	for (const target of targets) {
		const viewportChanged = !sameViewport(target.viewport, currentViewport);
		const navigationChanged =
			target.path !== currentPath ||
			target.navigationKey !== currentNavigationKey ||
			viewportChanged;

		if (navigationChanged) {
			await page.setViewportSize(target.viewport);
			await prepareStablePageWithRadius(page, target.path, level);
			currentPath = target.path;
			currentViewport = target.viewport;
			currentNavigationKey = target.navigationKey;
			currentRootFontSizePx = await page.evaluate(() =>
				Number.parseFloat(
					getComputedStyle(document.documentElement).fontSize,
				),
			);
		}

		if (target.prepare) {
			await target.prepare(page);
		}

		const reference = getReference(target.referenceId);
		const targetKey = getRadiusTargetKey(target);
		const measuredBaseline = RADIUS_REFERENCE_BASELINE[targetKey];
		const expected = measuredBaseline
			? getScaledRadiusPxFromMeasuredBaseline(
					Number.parseFloat(measuredBaseline.radiusPx),
					level,
				)
			: getExpectedRadiusPx(
					target.basePx,
					level,
					currentRootFontSizePx,
					reference.baselineUnit ?? "rem16px",
				);
		await expect
			.poll(
				async () =>
					target.locate(page).evaluate((node) =>
						getComputedStyle(node as HTMLElement).borderTopLeftRadius,
					),
				{
					message: `${target.label} should match ${reference.sourcePath} (${reference.sourceRadius})`,
				},
			)
			.toBe(expected);
	}
}
