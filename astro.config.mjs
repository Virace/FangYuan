import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkDirectiveRehype from "remark-directive-rehype";
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import {
	defaultExpressiveCodeConfig,
	defaultSiteConfig,
} from "./src/default-config.ts";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { remarkExpressiveMarkdown } from "./src/plugins/remark-expressive-markdown.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import {
	normalizeQingYanDevProxyPath,
	normalizeQingYanDevProxyRequestPath,
} from "./src/utils/qingyan/dev-proxy.mjs";
import {
	createQingYanMockPlugin,
	isQingYanMockTarget,
} from "./src/utils/qingyan/mock-api.mjs";
import {
	loadExternalAstroSiteConfig,
	loadExternalQingYanDevProxyTarget,
	loadExternalPermalinkConfig,
	loadExternalExpressiveCodeConfig,
} from "./src/utils/site-source.ts";
import {
	normalizeConfiguredBase,
	normalizeConfiguredSite,
} from "./src/utils/site-runtime-config.ts";
import { resolveAstroBuildConfig } from "./src/utils/permalink-materialization.ts";

const expressiveCodeConfig = {
	...defaultExpressiveCodeConfig,
	...(loadExternalExpressiveCodeConfig() ?? {}),
};
const externalAstroSiteConfig = loadExternalAstroSiteConfig();
const externalPermalinkConfig = loadExternalPermalinkConfig();
const siteUrl =
	externalAstroSiteConfig?.site ?? normalizeConfiguredSite(defaultSiteConfig.site);
const basePath =
	externalAstroSiteConfig?.base ?? normalizeConfiguredBase(defaultSiteConfig.base);
const permalinkBuildMode = resolveAstroBuildConfig({
	postsPattern:
		externalPermalinkConfig?.postsPattern ??
		defaultSiteConfig.permalink.postsPattern,
	pagesPattern:
		externalPermalinkConfig?.pagesPattern ??
		defaultSiteConfig.permalink.pagesPattern,
	trailingSlash:
		externalPermalinkConfig?.trailingSlash ??
		defaultSiteConfig.permalink.trailingSlash,
	postPatternRulePatterns:
		externalPermalinkConfig?.postPatternRulePatterns ??
		defaultSiteConfig.permalink.postPatternRules.map((rule) => rule.pattern),
});
const qingyanDevProxyTarget =
	process.env.QINGYAN_DEV_PROXY_TARGET ?? loadExternalQingYanDevProxyTarget();
const useQingYanMock = isQingYanMockTarget(qingyanDevProxyTarget);
const enableGlobalImageCodecDefaults = false;
const globalImageServiceConfig = {
	jpeg: { mozjpeg: true },
	webp: { effort: 6, alphaQuality: 80 },
	avif: { effort: 4, chromaSubsampling: "4:2:0" },
	png: { compressionLevel: 9 },
};
const qingyanDevProxy = qingyanDevProxyTarget && !useQingYanMock
	? {
			"/api": {
				target: qingyanDevProxyTarget,
				changeOrigin: true,
				rewrite: normalizeQingYanDevProxyPath,
			},
		}
	: undefined;
const qingyanDevProxyMiddlewarePlugin = qingyanDevProxyTarget && !useQingYanMock
	? {
			name: "fangyuan-qingyan-dev-proxy-normalizer",
			configureServer(server) {
				const normalizeMiddleware = (req, _res, next) => {
					if (req.url) {
						req.url = normalizeQingYanDevProxyRequestPath(req.url);
					}
					next();
				};

				server.middlewares.stack.unshift({
					route: "",
					handle: normalizeMiddleware,
				});
			},
			configurePreviewServer(server) {
				return () => {
					const normalizeMiddleware = (req, _res, next) => {
						if (req.url) {
							req.url = normalizeQingYanDevProxyRequestPath(req.url);
						}
						next();
					};

					server.middlewares.stack.unshift({
						route: "",
						handle: normalizeMiddleware,
					});
				};
			},
		}
	: null;
const qingyanMockPlugin = useQingYanMock ? createQingYanMockPlugin() : null;

// https://astro.build/config
export default defineConfig({
	...(siteUrl ? { site: siteUrl } : {}),
	base: basePath,
	trailingSlash: permalinkBuildMode.trailingSlash,
	build: {
		format: permalinkBuildMode.buildFormat,
	},
	fonts: [
		{
			name: "Roboto",
			cssVariable: "--font-roboto",
			provider: fontProviders.fontsource(),
			weights: [400, 500, 700],
			styles: ["normal"],
			fallbacks: ["sans-serif"],
		},
		{
			name: "JetBrains Mono",
			cssVariable: "--font-jetbrains-mono",
			provider: fontProviders.fontsource(),
			weights: [400, 500, 700],
			styles: ["normal", "italic"],
			fallbacks: ["monospace"],
		},
	],
	...(enableGlobalImageCodecDefaults
		? {
				image: {
					service: {
						config: globalImageServiceConfig,
					},
				},
			}
		: {}),
	integrations: [
		swup({
			theme: false,
			animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
			// the default value `transition-` cause transition delay
			// when the Tailwind class `transition-all` is used
			containers: ["main", "#toc"],
			smoothScrolling: true,
			cache: true,
			preload: true,
			accessibility: true,
			updateHead: true,
			updateBodyClass: false,
			globalInstance: true,
		}),
		icon({
			include: {
				"preprocess: vitePreprocess(),": ["*"],
				"fa6-brands": ["*"],
				"fa6-regular": ["*"],
				"fa6-solid": ["*"],
			},
		}),
		expressiveCode({
			themes: [expressiveCodeConfig.theme, expressiveCodeConfig.theme],
			plugins: [
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				pluginLanguageBadge(),
				pluginCustomCopyButton(),
			],
			defaultProps: {
				wrap: true,
				overridesByLang: {
					shellsession: {
						showLineNumbers: false,
					},
				},
			},
			styleOverrides: {
				codeBackground: "var(--codeblock-bg)",
				borderRadius: "0.75rem",
				borderColor: "none",
				codeFontSize: "0.875rem",
				codeFontFamily:
					"var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {
					editorBackground: "var(--codeblock-bg)",
					terminalBackground: "var(--codeblock-bg)",
					terminalTitlebarBackground: "var(--codeblock-topbar-bg)",
					editorTabBarBackground: "var(--codeblock-topbar-bg)",
					editorActiveTabBackground: "none",
					editorActiveTabIndicatorBottomColor: "var(--primary)",
					editorActiveTabIndicatorTopColor: "none",
					editorTabBarBorderBottomColor: "var(--codeblock-topbar-bg)",
					terminalTitlebarBorderBottomColor: "none",
				},
				textMarkers: {
					delHue: 0,
					insHue: 180,
					markHue: 250,
				},
			},
			frames: {
				showCopyToClipboardButton: false,
			},
		}),
		svelte(),
		...(siteUrl ? [sitemap()] : []),
	],
	markdown: {
		remarkPlugins: [
			remarkMath,
			remarkReadingTime,
			remarkExcerpt,
			remarkGithubAdmonitionsToDirectives,
			remarkDirective,
			remarkExpressiveMarkdown,
			remarkDirectiveRehype,
			remarkSectionize,
		],
		rehypePlugins: [
			rehypeKatex,
			rehypeSlug,
			[
				rehypeComponents,
				{
					components: {
						github: GithubCardComponent,
						note: (x, y) => AdmonitionComponent(x, y, "note"),
						tip: (x, y) => AdmonitionComponent(x, y, "tip"),
						important: (x, y) => AdmonitionComponent(x, y, "important"),
						caution: (x, y) => AdmonitionComponent(x, y, "caution"),
						warning: (x, y) => AdmonitionComponent(x, y, "warning"),
					},
				},
			],
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: {
						className: ["anchor"],
					},
					content: {
						type: "element",
						tagName: "span",
						properties: {
							className: ["anchor-icon"],
							"data-pagefind-ignore": true,
						},
						children: [
							{
								type: "text",
								value: "#",
							},
						],
					},
				},
			],
		],
	},
	vite: {
		plugins: [
			tailwindcss(),
			...(qingyanDevProxyMiddlewarePlugin ? [qingyanDevProxyMiddlewarePlugin] : []),
			...(qingyanMockPlugin ? [qingyanMockPlugin] : []),
		],
		...(qingyanDevProxy
			? {
					server: {
						proxy: qingyanDevProxy,
					},
					preview: {
						proxy: qingyanDevProxy,
					},
				}
			: {}),
		build: {
			rollupOptions: {
				onwarn(warning, warn) {
					// temporarily suppress this warning
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
		},
	},
});
