import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { experimental_AstroContainer } from "astro/container";
import { hastToHtml, htmlToHast } from "satteri";
import { parse } from "yaml";
import { defaultSiteConfig } from "../default-config.ts";
import { loadExternalSiteConfigYaml } from "../utils/site-source/external-config.ts";
import { resolveTocConfig } from "../utils/toc-config.ts";

function inside(root, target) {
	const relative = path.relative(root, target);
	return (
		!path.isAbsolute(relative) &&
		relative !== ".." &&
		!relative.startsWith(`..${path.sep}`)
	);
}

function splitSource(source) {
	const match = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
	return match
		? {
				frontmatter: parse(match[1]) ?? {},
				body: source.slice(match[0].length),
			}
		: { frontmatter: {}, body: source };
}

function send(response, status, body, contentType = "application/json") {
	response.writeHead(status, {
		"Content-Type": contentType,
		"Cache-Control": "no-store",
	});
	response.end(
		contentType === "application/json" ? JSON.stringify(body) : body,
	);
}

/** 只在 Studio 显式启用时暴露本机渲染入口，正常静态构建不安装该集成。 */
export function studioIntegration() {
	let config;
	let renderer;
	const resources = new Map();
	function publish(value) {
		const id = createHash("sha256").update(value).digest("hex").slice(0, 24);
		resources.set(id, value);
		return `/_studio/resources/${id}`;
	}
	return {
		name: "fangyuan-studio",
		hooks: {
			"astro:config:setup"({ injectRoute }) {
				injectRoute({
					pattern: "/_studio/frame",
					entrypoint: fileURLToPath(
						new URL(
							"../components/studio/StudioPreview.astro",
							import.meta.url,
						),
					),
					prerender: false,
				});
			},
			"astro:config:done"({ config: resolved }) {
				config = resolved;
			},
			"astro:server:setup"({ server, logger }) {
				const siteRoot = path.resolve(process.env.FANGYUAN_SITE_ROOT);
				const themeRoot = fileURLToPath(config.root);
				const token = process.env.FANGYUAN_STUDIO_TOKEN;
				const framePath =
					config.trailingSlash === "always"
						? "/_studio/frame/"
						: "/_studio/frame";
				function rewriteResources(source, base, type) {
					function reference(value, stylesheet = false) {
						if (!value || /^(?:data:|https?:|#|\/\/|javascript:)/i.test(value))
							return value;
						const resolved = new URL(value, `http://localhost${base}`);
						// 代理 fetch 没有浏览器样式请求头，显式请求 CSS，避免 Vite 返回 JavaScript 模块。
						if (stylesheet) resolved.searchParams.set("direct", "");
						return publish(`${resolved.pathname}${resolved.search}`);
					}
					if (type.includes("html")) {
						const tree = htmlToHast(source);
						function visit(parent) {
							parent.children = (parent.children ?? []).filter((node) => {
								if (node.type !== "element") return true;
								if (
									node.tagName === "script" &&
									node.properties.src?.includes("/@vite/client")
								)
									return false;
								if (node.tagName === "style") {
									for (const child of node.children ?? []) {
										if (child.type === "text")
											child.value = rewriteResources(
												child.value,
												base,
												"text/css",
											);
									}
								}
								if (
									node.tagName === "script" &&
									node.properties.type === "module" &&
									!node.properties.src
								) {
									for (const child of node.children ?? []) {
										if (child.type === "text")
											child.value = rewriteResources(
												child.value,
												base,
												"text/javascript",
											);
									}
								}
								for (const key of ["src", "href"]) {
									const value = node.properties[key];
									if (
										typeof value === "string" &&
										["script", "link", "img", "source"].includes(node.tagName)
									)
										node.properties[key] = reference(
											value,
											node.tagName === "link" &&
												key === "href" &&
												node.properties.rel?.includes("stylesheet"),
										);
								}
								if (node.tagName === "astro-island") {
									for (const key of [
										"component-url",
										"renderer-url",
										"before-hydration-url",
									]) {
										if (typeof node.properties[key] === "string")
											node.properties[key] = reference(node.properties[key]);
										const camelKey = key.replace(/-([a-z])/g, (_full, letter) =>
											letter.toUpperCase(),
										);
										if (typeof node.properties[camelKey] === "string")
											node.properties[camelKey] = reference(
												node.properties[camelKey],
											);
									}
								}
								if (node.properties.srcSet)
									node.properties.srcSet = String(node.properties.srcSet)
										.split(",")
										.map((part) => {
											const [url, descriptor] = part.trim().split(/\s+/);
											return `${reference(url)}${descriptor ? ` ${descriptor}` : ""}`;
										})
										.join(", ");
								visit(node);
								return true;
							});
						}
						visit(tree);
						return hastToHtml(tree);
					}
					if (type.includes("css"))
						return source.replace(
							/url\((['"]?)([^)'"\s]+)\1\)/g,
							(full, _quote, value) =>
								/^(?:data:|https?:|#)/.test(value)
									? full
									: `url("${reference(value)}")`,
						);
					if (type.includes("javascript")) {
						return source
							.replace(
								/const __vite__css = ("(?:[^"\\]|\\.)*")/g,
								(_full, value) =>
									`const __vite__css = ${JSON.stringify(rewriteResources(JSON.parse(value), base, "text/css"))}`,
							)
							.replace(
								/\nimport\.meta\.hot\.accept\(\)\s*\nimport\.meta\.hot\.prune\(\(\) => __vite__removeStyle\(__vite__id\)\)/g,
								"",
							)
							.replace(
								/((?:from\s*|import\s*\(?\s*))(["'])(\.{1,2}\/[^"']+|\/[^"']+)\2/g,
								(_full, prefix, quote, value) =>
									`${prefix}${quote}${reference(value)}${quote}`,
							)
							.replace(
								/(["'])(\/(?:@fs|src|node_modules|static|_astro|@id)\/[^"']+)\1/g,
								(_full, quote, value) => `${quote}${reference(value)}${quote}`,
							);
					}
					return source;
				}
				async function styles() {
					const result = await server.transformRequest(
						"/src/styles/studio.css?direct",
					);
					if (!result)
						throw new Error("Studio stylesheet could not be compiled");
					const site = loadExternalSiteConfigYaml(
						path.join(siteRoot, "site.config.yaml"),
					);
					const hue =
						site?.siteConfig?.themeColor?.hue ??
						defaultSiteConfig.themeColor.hue;
					const css = result.code
						.replace(/url\((['"]?)([^)'"\s]+)\1\)/g, (full, _quote, url) => {
							if (/^(?:data:|https?:|#)/.test(url)) return full;
							return `url("${publish(url)}")`;
						})
						.replace(/:root|:host\b/g, ":scope")
						.replace(/:scope\.dark\b/g, ":scope:where(.dark, .dark *)");
					return `@scope (.fangyuan-canvas) {\n:scope { --hue: ${Number(hue)}; }\n${css}\n}`;
				}
				async function renderArticle(input) {
					const file = await fs.realpath(path.resolve(siteRoot, input.path));
					const root = await fs.realpath(siteRoot);
					if (!inside(root, file) || !/\.md$/i.test(file))
						throw new Error("Invalid article context");
					const { frontmatter, body } = splitSource(input.source);
					const markdown = config.markdown;
					// 使用所有 Astro integration 完成后的管线，包含 Expressive Code 的 Sätteri 接入。
					renderer ??= markdown.processor.createRenderer({
						image: config.image,
						syntaxHighlight: markdown.syntaxHighlight,
						shikiConfig: markdown.shikiConfig,
						gfm: markdown.gfm,
						smartypants: markdown.smartypants,
					});
					const result = await (await renderer).render(body, {
						frontmatter,
						fileURL: pathToFileURL(file),
					});
					const tree = htmlToHast(result.code, { fragment: true });
					const styleUrls = [];
					const scripts = [];
					function walk(parent) {
						parent.children = (parent.children ?? []).filter((node) => {
							if (node.type !== "element") return true;
							if (node.tagName === "style") {
								styleUrls.push(
									publish(
										`inline:css:${(node.children ?? []).map((child) => child.value ?? "").join("")}`,
									),
								);
								return false;
							}
							if (
								node.tagName === "link" &&
								node.properties?.rel?.includes("stylesheet")
							) {
								const stylesheet = new URL(
									node.properties.href,
									"http://localhost",
								);
								stylesheet.searchParams.set("direct", "");
								styleUrls.push(
									publish(`${stylesheet.pathname}${stylesheet.search}`),
								);
								return false;
							}
							if (node.tagName === "script") {
								if (node.properties.src)
									scripts.push(publish(node.properties.src));
								else if (node.properties.type === "module")
									scripts.push(
										publish(
											`inline:js:${(node.children ?? []).map((child) => child.value ?? "").join("")}`,
										),
									);
								return false;
							}
							if (node.tagName === "img") {
								const marker = Object.keys(node.properties).find(
									(key) => key.toLowerCase() === "__astro_image_",
								);
								if (marker) {
									const image = JSON.parse(node.properties[marker]);
									delete node.properties[marker];
									node.properties = { ...node.properties, ...image };
									delete node.properties.index;
									delete node.properties.inferSize;
								}
								const src = node.properties.src;
								if (
									typeof src === "string" &&
									!/^(?:https?:|data:|\/\/)/i.test(src)
								) {
									node.properties.src = `/api/assets?path=${encodeURIComponent(input.path)}&src=${encodeURIComponent(src)}`;
								}
							}
							walk(node);
							return true;
						});
					}
					walk(tree);
					const tocModule = await server.ssrLoadModule(
						"/src/components/widget/TOC.astro",
					);
					const metaModule = await server.ssrLoadModule(
						"/src/components/studio/StudioPostMeta.astro",
					);
					const { siteConfig } = await server.ssrLoadModule("/src/config.ts");
					const resolvedToc = resolveTocConfig({
						pageKind: input.path.startsWith("content/spec/") ? "spec" : "post",
						siteToc: siteConfig.toc,
						headingsCount: result.metadata.headings.length,
						frontmatterToc: frontmatter.toc,
					});
					const container = await experimental_AstroContainer.create();
					const tocHtml = await container.renderToString(tocModule.default, {
						props: {
							headings: result.metadata.headings,
							depth: resolvedToc.depth,
						},
					});
					const cover =
						typeof frontmatter.image === "string" ? frontmatter.image : "";
					const coverSrc = /^(?:https?:|data:|\/\/)/i.test(cover)
						? cover
						: cover
							? `/api/assets?path=${encodeURIComponent(input.path)}&src=${encodeURIComponent(cover.split("/").map(encodeURIComponent).join("/"))}`
							: "";
					const metadataHtml = await container.renderToString(
						metaModule.default,
						{
							props: { frontmatter },
						},
					);
					const renderedCover = await container.renderToString(
						metaModule.default,
						{
							props: { frontmatter, coverSrc, coverOnly: true },
						},
					);
					const coverTree = htmlToHast(renderedCover, { fragment: true });
					function setCoverSource(node) {
						if (node.type === "element" && node.tagName === "img")
							node.properties.src = coverSrc;
						for (const child of node.children ?? []) setCoverSource(child);
					}
					setCoverSource(coverTree);
					return {
						html: hastToHtml(tree),
						title: String(
							frontmatter.title ?? path.basename(input.path, ".md"),
						),
						toc: result.metadata.headings,
						tocHtml,
						metadataHtml,
						coverHtml: hastToHtml(coverTree),
						tocEnabled: resolvedToc.enable,
						siteUrl: config.site?.toString(),
						styles: styleUrls,
						scripts,
					};
				}
				server.middlewares.use(async (request, response, next) => {
					const url = new URL(request.url ?? "/", "http://localhost");
					if (!url.pathname.startsWith("/_studio/")) return next();
					if (!token || request.headers["x-fangyuan-studio-token"] !== token)
						return send(response, 403, {
							error: "Studio authentication required",
						});
					if (url.pathname === "/_studio/frame" || url.pathname === framePath) {
						if (request.headers["x-fangyuan-studio-frame"] === "1")
							return next();
						const address = server.httpServer.address();
						const upstream = await fetch(
							`http://127.0.0.1:${address.port}${framePath}`,
							{
								headers: {
									"x-fangyuan-studio-token": token,
									"x-fangyuan-studio-frame": "1",
								},
							},
						);
						return send(
							response,
							upstream.status,
							rewriteResources(await upstream.text(), framePath, "text/html"),
							"text/html",
						);
					}
					try {
						if (url.pathname === "/_studio/ready")
							return send(response, 200, { adapterVersion: 1 });
						if (url.pathname === "/_studio/styles.css")
							return send(response, 200, await styles(), "text/css");
						if (url.pathname.startsWith("/_studio/resources/")) {
							const resource = resources.get(
								url.pathname.slice("/_studio/resources/".length),
							);
							if (!resource)
								return send(response, 404, {
									error: "Unknown Studio resource",
								});
							if (resource.split("?")[0] === "/@vite/client") {
								return send(
									response,
									200,
									`const styles = new Map();
export function createHotContext() { return undefined; }
export function updateStyle(id, content) { let style = styles.get(id); if (!style) { style = document.createElement("style"); styles.set(id, style); document.head.append(style); } style.textContent = content; }
export function removeStyle(id) { styles.get(id)?.remove(); styles.delete(id); }
export function injectQuery(url, query) { return url + (url.includes("?") ? "&" : "?") + query; }
`,
									"text/javascript",
								);
							}
							if (resource.startsWith("inline:css:"))
								return send(response, 200, resource.slice(11), "text/css");
							if (resource.startsWith("inline:js:"))
								return send(
									response,
									200,
									resource.slice(10),
									"text/javascript",
								);
							const address = server.httpServer.address();
							const upstream = await fetch(
								new URL(resource, `http://127.0.0.1:${address.port}`),
							);
							const type =
								upstream.headers.get("content-type") ??
								"application/octet-stream";
							if (/css|javascript/.test(type))
								return send(
									response,
									upstream.status,
									rewriteResources(await upstream.text(), resource, type),
									type,
								);
							return send(
								response,
								upstream.status,
								Buffer.from(await upstream.arrayBuffer()),
								type,
							);
						}
						if (
							url.pathname === "/_studio/render" &&
							request.method === "POST"
						) {
							let source = "";
							for await (const chunk of request) {
								source += chunk;
								if (Buffer.byteLength(source) > 2 * 1024 * 1024)
									return send(response, 413, { error: "Article too large" });
							}
							return send(
								response,
								200,
								await renderArticle(JSON.parse(source)),
							);
						}
						return send(response, 404, { error: "Unknown Studio endpoint" });
					} catch (error) {
						logger.error(
							error instanceof Error ? error.message : "Studio render failed",
						);
						return send(response, 422, {
							error: "方圆渲染失败，请检查 Markdown 与图片引用。",
						});
					}
				});
				server.watcher.add(path.join(themeRoot, "src/styles"));
			},
		},
	};
}
