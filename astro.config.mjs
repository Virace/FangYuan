import fs from "node:fs";
import path from "node:path";
import { unified } from "@astrojs/markdown-remark";
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
import { parse as parseYaml } from "yaml";
import { resolveSiteBuildPaths } from "./scripts/site/build-paths.mjs";
import {
	defaultExpressiveCodeConfig,
	defaultPageFeedbackConfig,
	defaultSiteConfig,
} from "./src/default-config.ts";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { BilibiliVideoComponent } from "./src/plugins/rehype-component-bilibili-video.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { LinkCardComponent } from "./src/plugins/rehype-component-link-card.mjs";
import { LinkGridComponent } from "./src/plugins/rehype-component-link-grid.mjs";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkExpressiveMarkdown } from "./src/plugins/remark-expressive-markdown.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import { clearContentRouteManifestCache } from "./src/utils/content-routes.ts";
import { resolveAstroBuildConfig } from "./src/utils/permalink/materialization.ts";
import { resolveFangYuanRoot } from "./src/utils/project-root.ts";
import {
	normalizeQingYanDevProxyPath,
	normalizeQingYanDevProxyRequestPath,
} from "./src/utils/qingyan/dev-proxy.mjs";
import {
	createQingYanMockPlugin,
	isQingYanMockTarget,
} from "./src/utils/qingyan/mock-api.mjs";
import { externalSiteAssetDevPrefix } from "./src/utils/site-source/assets.ts";
import { resolveSiteSourceContext } from "./src/utils/site-source/context.ts";
import { createDevStaticAssetMiddleware } from "./src/utils/site-source/dev-static-assets.mjs";
import {
	createDevWatcherListenerLimitPlugin,
	registerExternalSiteConfigWatch,
	registerExternalSiteDevWatch,
} from "./src/utils/site-source/dev-watch.mjs";
import { resolveDevWatchIgnoredPatterns } from "./src/utils/site-source/dev-watch-ignore.mjs";
import { normalizeAstroContentImageImporterQuery } from "./src/utils/site-source/content-image-importer.ts";
import { loadExternalSiteConfigYaml } from "./src/utils/site-source/external-config.ts";
import {
	normalizeConfiguredBase,
	normalizeConfiguredSite,
} from "./src/utils/site-source/runtime-config.ts";
import {
	loadExternalAstroSiteConfig,
	loadExternalExpressiveCodeConfig,
	loadExternalPermalinkConfig,
	loadExternalQingYanDevProxyTarget,
	resolveAstroBasePath,
} from "./src/utils/site-source/source.ts";

const expressiveCodeConfig = {
	...defaultExpressiveCodeConfig,
	...(loadExternalExpressiveCodeConfig() ?? {}),
};
const fangyuanRoot = resolveFangYuanRoot();
process.env.FANGYUAN_ROOT = fangyuanRoot;
const siteSourceContext = resolveSiteSourceContext({ fangyuanRoot });
const externalSiteConfig =
	siteSourceContext.useExternalConfig &&
	siteSourceContext.externalConfigPath !== null
		? loadExternalSiteConfigYaml(siteSourceContext.externalConfigPath)
		: null;
const externalAstroSiteConfig = loadExternalAstroSiteConfig();
const externalPermalinkConfig = loadExternalPermalinkConfig();
const siteBuildPaths = resolveSiteBuildPaths({ cwd: fangyuanRoot });
const externalSiteRoot =
	siteSourceContext.siteRoot ?? path.join(fangyuanRoot, "site");
const devWatchIgnoredPatterns = resolveDevWatchIgnoredPatterns(fangyuanRoot);
const emptyPublicDir = ".temp/empty-public";
fs.mkdirSync(path.join(fangyuanRoot, emptyPublicDir), { recursive: true });
const astroCommand = process.argv.includes("dev")
	? "dev"
	: process.argv.includes("preview")
		? "preview"
		: "build";
const envSiteUrl = normalizeConfiguredSite(process.env.FANGYUAN_SITE);
const envBasePath =
	process.env.FANGYUAN_BASE === undefined
		? null
		: normalizeConfiguredBase(process.env.FANGYUAN_BASE);
const siteUrl =
	externalAstroSiteConfig?.site ??
	envSiteUrl ??
	normalizeConfiguredSite(defaultSiteConfig.site);
const configuredBasePath =
	externalAstroSiteConfig?.base ??
	envBasePath ??
	normalizeConfiguredBase(defaultSiteConfig.base);
const basePath = resolveAstroBasePath(
	configuredBasePath,
	astroCommand === "dev" ? process.env.FANGYUAN_DEV_BASE : null,
);
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
const enableGlobalImageCodecDefaults = false;
const globalImageServiceConfig = {
	jpeg: { mozjpeg: true },
	webp: { effort: 6, alphaQuality: 80 },
	avif: { effort: 4, chromaSubsampling: "4:2:0" },
	png: { compressionLevel: 7 },
};
function resolveQingYanDevProxyTarget(command) {
	return command === "dev" || command === "preview"
		? (process.env.QINGYAN_DEV_PROXY_TARGET ??
				loadExternalQingYanDevProxyTarget())
		: null;
}
function createQingYanDevProxy(target) {
	return target
		? {
				"/api": {
					target,
					changeOrigin: true,
					rewrite: normalizeQingYanDevProxyPath,
				},
			}
		: undefined;
}
function createQingYanDevProxyMiddlewarePlugin(target) {
	return target
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
}
const localImageExtensionPattern = /\.(?:avif|gif|jpeg|jpg|png|svg|webp)$/i;
const windowsAbsolutePathPattern = /([A-Za-z]:\/.*)$/;
const normalizedExternalSiteRoot = path
	.resolve(externalSiteRoot)
	.replace(/\\/g, "/")
	.toLowerCase();

function resolveExternalSiteAssetImport(id) {
	const queryIndex = id.indexOf("?");
	const importPath = queryIndex >= 0 ? id.slice(0, queryIndex) : id;

	if (!localImageExtensionPattern.test(importPath)) {
		return null;
	}

	const normalizedId = importPath.replace(/\\/g, "/");
	const match = normalizedId.match(windowsAbsolutePathPattern);
	const absoluteImportPath = match
		? match[1]
		: normalizedId.startsWith("/")
			? normalizedId
			: isExternalSiteAsset(normalizedId)
				? path.resolve(externalSiteRoot, normalizedId)
			: null;
	if (!absoluteImportPath) {
		return null;
	}

	const candidate = path.resolve(absoluteImportPath).replace(/\\/g, "/");
	const normalizedCandidate = candidate.toLowerCase();
	if (
		normalizedCandidate !== normalizedExternalSiteRoot &&
		!normalizedCandidate.startsWith(`${normalizedExternalSiteRoot}/`)
	) {
		return null;
	}

	if (!fs.existsSync(candidate)) {
		return null;
	}

	return candidate;
}

function isExternalSiteAsset(value) {
	if (typeof value !== "string" || value.trim() === "") {
		return false;
	}

	if (
		value.startsWith("/") ||
		value.startsWith("public/") ||
		/^https?:\/\//.test(value) ||
		value.startsWith("data:")
	) {
		return false;
	}

	return value.startsWith("assets/") && localImageExtensionPattern.test(value);
}

function addExternalSiteAssetReference(references, value) {
	if (isExternalSiteAsset(value)) {
		references.add(value.replace(/\\/g, "/").replace(/^\/+/, ""));
	}
}

function addExternalSiteAssetReferencesFromHtml(references, value) {
	if (typeof value !== "string" || value.trim() === "") {
		return;
	}

	const attributePattern = /\s(?:src|href)=["'](assets\/[^"']+)["']/gi;
	for (const match of value.matchAll(attributePattern)) {
		addExternalSiteAssetReference(references, match[1]);
	}
}

function walkMarkdownFiles(directoryPath) {
	if (!fs.existsSync(directoryPath)) {
		return [];
	}

	const files = [];
	for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
		const entryPath = path.join(directoryPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkMarkdownFiles(entryPath));
			continue;
		}
		if (entry.isFile() && entry.name.endsWith(".md")) {
			files.push(entryPath);
		}
	}
	return files;
}

function readFrontmatter(source) {
	if (!source.startsWith("---")) {
		return null;
	}

	const end = source.indexOf("\n---", 3);
	if (end < 0) {
		return null;
	}

	return source.slice(3, end);
}

function collectExternalContentAssetReferences(references) {
	if (!siteSourceContext.useExternalContent) {
		return;
	}

	const postsRoot = path.join(siteSourceContext.contentRoot, "posts");
	for (const filePath of walkMarkdownFiles(postsRoot)) {
		const source = fs.readFileSync(filePath, "utf8");
		const frontmatter = readFrontmatter(source);
		if (!frontmatter) {
			continue;
		}

		const parsed = parseYaml(frontmatter) ?? {};
		addExternalSiteAssetReference(references, parsed.image);
	}
}

function collectExternalSiteAssetReferences() {
	const references = new Set();
	if (
		!siteSourceContext.useExternalConfig &&
		!siteSourceContext.useExternalContent
	) {
		return [];
	}

	const siteConfig = externalSiteConfig?.siteConfig;
	const profileConfig = externalSiteConfig?.profileConfig;
	const footerConfig = externalSiteConfig?.footerConfig;
	const pageFeedbackConfig = externalSiteConfig?.pageFeedbackConfig;

	addExternalSiteAssetReference(references, siteConfig?.banner?.src);
	for (const favicon of siteConfig?.favicon ?? []) {
		addExternalSiteAssetReference(references, favicon.src);
	}
	addExternalSiteAssetReference(references, profileConfig?.avatar);
	addExternalSiteAssetReferencesFromHtml(references, footerConfig?.customHtml);
	if (
		pageFeedbackConfig?.reward?.enable ??
		defaultPageFeedbackConfig.reward.enable
	) {
		for (const option of pageFeedbackConfig?.reward?.options ?? []) {
			addExternalSiteAssetReference(references, option.image);
		}
	}
	collectExternalContentAssetReferences(references);

	return [...references].filter((reference) => {
		const candidate = path.resolve(externalSiteRoot, reference);
		return fs.existsSync(candidate);
	});
}

function externalSiteAssetModulePlugin() {
	const virtualModuleId = "virtual:fangyuan-site-assets";
	const resolvedVirtualModuleId = `\0${virtualModuleId}`;

	return {
		name: "fangyuan-external-site-asset-manifest",
		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId;
			}
			return null;
		},
		load(id) {
			if (id !== resolvedVirtualModuleId) {
				return null;
			}

			const assetReferences = collectExternalSiteAssetReferences();
			const entries = assetReferences
				.map((reference) => {
					const importPath = `@fangyuan-site/${reference}`;
					return `${JSON.stringify(reference)}: () => import(${JSON.stringify(importPath)})`;
				})
				.join(",\n");
			return `export default {\n${entries}\n};\n`;
		},
	};
}

function externalSiteAssetPlugin() {
	return {
		name: "fangyuan-external-site-assets",
		enforce: "pre",
		resolveId(id) {
			return resolveExternalSiteAssetImport(id);
		},
	};
}

function externalContentImageImporterPlugin() {
	return {
		name: "fangyuan-external-content-image-importers",
		enforce: "pre",
		transform(code, id) {
			const modulePath = id.split("?")[0].replace(/\\/g, "/");
			if (!modulePath.endsWith("/.astro/content-assets.mjs")) {
				return null;
			}

			const normalizedCode = normalizeAstroContentImageImporterQuery(code);
			if (normalizedCode === code) {
				return null;
			}

			return {
				code: normalizedCode,
				map: null,
			};
		},
	};
}

function externalSiteDevWatchIntegration() {
	return {
		name: "fangyuan-external-site-dev-watch",
		hooks: {
			"astro:config:setup"({ addWatchFile }) {
				registerExternalSiteConfigWatch({
					addWatchFile,
					siteRoot: externalSiteRoot,
					enabled: siteSourceContext.useExternalConfig,
				});
			},
			"astro:server:setup"({ server, refreshContent }) {
				registerExternalSiteDevWatch({
					server,
					siteRoot: externalSiteRoot,
					enabled:
						siteSourceContext.useExternalContent ||
						siteSourceContext.useExternalConfig,
					refreshContent,
					clearContentRouteManifestCache,
				});
			},
		},
	};
}

function getMimeType(filePath) {
	const extension = path.extname(filePath).toLowerCase();
	if (extension === ".svg") return "image/svg+xml";
	if (extension === ".png") return "image/png";
	if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
	if (extension === ".webp") return "image/webp";
	if (extension === ".gif") return "image/gif";
	if (extension === ".avif") return "image/avif";
	return "application/octet-stream";
}

function externalSiteAssetDevServerPlugin() {
	const devStaticAssetMiddleware = createDevStaticAssetMiddleware({
		cwd: fangyuanRoot,
		externalSiteRoot,
		externalSiteAssetDevPrefix,
		getMimeType,
		isExternalSiteAsset,
	});

	return {
		name: "fangyuan-external-site-asset-dev-server",
		configureServer(server) {
			server.middlewares.use(devStaticAssetMiddleware);
		},
	};
}

const qingyanDevProxyTarget = resolveQingYanDevProxyTarget(astroCommand);
const useQingYanMock = isQingYanMockTarget(qingyanDevProxyTarget);
const qingyanDevProxy =
	qingyanDevProxyTarget && !useQingYanMock
		? createQingYanDevProxy(qingyanDevProxyTarget)
		: undefined;
const qingyanDevProxyMiddlewarePlugin =
	qingyanDevProxyTarget && !useQingYanMock
		? createQingYanDevProxyMiddlewarePlugin(qingyanDevProxyTarget)
		: null;
const qingyanMockPlugin =
	astroCommand === "dev" && useQingYanMock ? createQingYanMockPlugin() : null;

// https://astro.build/config
export default defineConfig({
	...(siteUrl ? { site: siteUrl } : {}),
	...(siteBuildPaths.outDir ? { outDir: siteBuildPaths.outDir } : {}),
	...(siteBuildPaths.cacheDir ? { cacheDir: siteBuildPaths.cacheDir } : {}),
	publicDir: emptyPublicDir,
	base: basePath,
	trailingSlash: permalinkBuildMode.trailingSlash,
	build: {
		format: permalinkBuildMode.buildFormat,
		assets: "static",
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
		externalSiteDevWatchIntegration(),
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
	],
	markdown: {
		processor: unified({
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
							bilibili: BilibiliVideoComponent,
							github: GithubCardComponent,
							"link-card": LinkCardComponent,
							"link-grid": LinkGridComponent,
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
		}),
	},
	vite: {
		resolve: {
			alias: [
				{
					find: "@fangyuan-site",
					replacement: externalSiteRoot,
				},
			],
		},
		plugins: [
			createDevWatcherListenerLimitPlugin(),
			externalSiteAssetModulePlugin(),
			externalContentImageImporterPlugin(),
			externalSiteAssetPlugin(),
			externalSiteAssetDevServerPlugin(),
			tailwindcss(),
			...(qingyanDevProxyMiddlewarePlugin
				? [qingyanDevProxyMiddlewarePlugin]
				: []),
			...(qingyanMockPlugin ? [qingyanMockPlugin] : []),
		],
		...(qingyanDevProxy
			? {
					server: {
						fs: {
							allow: [fangyuanRoot, externalSiteRoot],
						},
						watch: {
							ignored: devWatchIgnoredPatterns,
						},
						proxy: qingyanDevProxy,
					},
					preview: {
						proxy: qingyanDevProxy,
					},
				}
			: {
					server: {
						fs: {
							allow: [fangyuanRoot, externalSiteRoot],
						},
						watch: {
							ignored: devWatchIgnoredPatterns,
						},
					},
				}),
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
