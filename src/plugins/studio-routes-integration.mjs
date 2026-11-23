import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	publicRoutePath,
	renderHistoryRedirect,
} from "../utils/content-route-history.ts";
import {
	analyzeArticleRoute,
	assertNoRouteSaveLock,
	assertRouteSnapshot,
	prepareArticleRetirement,
	readRouteSnapshot,
} from "../utils/content-route-store.ts";
import { clearContentRouteManifestCache } from "../utils/content-routes.ts";
import { materializePublicPath } from "../utils/permalink/materialization.ts";
import { resolveSiteSourceContext } from "../utils/site-source/context.ts";

function send(response, status, value) {
	response.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Cache-Control": "no-store",
	});
	response.end(JSON.stringify(value));
}

/** 正式构建与编辑器共用同一组身份、路径及历史占用规则。 */
export function contentRoutesIntegration() {
	let config;
	let snapshot;
	let inspected;
	return {
		name: "fangyuan-content-routes",
		hooks: {
			"astro:config:done"({ config: resolved }) {
				config = resolved;
			},
			"astro:build:start"() {
				snapshot = readRouteSnapshot({ themeRoot: fileURLToPath(config.root) });
				inspected = assertRouteSnapshot(snapshot);
			},
			"astro:build:done": async ({ dir, logger }) => {
				const current = readRouteSnapshot({
					themeRoot: fileURLToPath(config.root),
				});
				if (current.inputDigest !== snapshot.inputDigest)
					throw new Error(
						"构建期间文章、配置或 content-routes.yaml 发生变化，请重新构建。",
					);
				const outputRoot = fileURLToPath(dir);
				for (const route of snapshot.routes.filter(
					(entry) => entry.published,
				)) {
					const output = path.join(
						outputRoot,
						materializePublicPath(route.publicPath).outputPath,
					);
					if (!existsSync(output))
						throw new Error(
							`当前文章目标未进入构建产物：${route.publicPath}（${route.sourcePath}）。`,
						);
				}
				for (const redirect of inspected.redirects) {
					const targetPath = publicRoutePath(
						redirect.targetPath,
						snapshot.base,
					);
					const canonical = snapshot.site
						? new URL(targetPath, snapshot.site).href
						: targetPath;
					const output = path.join(outputRoot, redirect.outputPath);
					if (existsSync(output))
						throw new Error(
							`历史地址 ${redirect.publicPath} 占用了本轮已有构建产物。`,
						);
					await fs.mkdir(path.dirname(output), { recursive: true });
					await fs.writeFile(
						output,
						renderHistoryRedirect(targetPath, canonical),
						"utf8",
					);
				}
				const entries = snapshot.routes
					.filter((route) => route.published)
					.map((route) => ({
						contentId: route.contentId ?? null,
						currentPath: route.publicPath,
						history: route.contentId
							? (snapshot.registry.documents[route.contentId]?.paths.filter(
									(routePath) => routePath !== route.publicPath,
								) ?? [])
							: [],
					}));
				await fs.writeFile(
					path.join(outputRoot, "content-index.json"),
					`${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), base: snapshot.base, entries }, null, 2)}\n`,
					"utf8",
				);
				assertNoRouteSaveLock(snapshot.siteRoot);
				if (
					readRouteSnapshot({ themeRoot: fileURLToPath(config.root) })
						.inputDigest !== snapshot.inputDigest
				)
					throw new Error("生成历史跳转期间构建输入发生变化，请重新构建。");
				logger.info(
					`已校验 ${snapshot.routes.length} 篇内容，生成 ${inspected.redirects.length} 个历史跳转及公开内容索引。`,
				);
			},
			"astro:server:setup"({ server }) {
				const themeRoot = fileURLToPath(config.root);
				const context = resolveSiteSourceContext({ fangyuanRoot: themeRoot });
				const registryPath = path.join(
					context.useExternalContent ? context.siteRoot : themeRoot,
					"content-routes.yaml",
				);
				server.watcher.add(registryPath);
				server.watcher.on("all", (_event, changedPath) => {
					if (path.resolve(changedPath) === registryPath)
						clearContentRouteManifestCache();
				});
				if (process.env.FANGYUAN_STUDIO !== "1") return;
				const token = process.env.FANGYUAN_STUDIO_TOKEN;
				server.middlewares.use(async (request, response, next) => {
					const pathname = new URL(request.url ?? "/", "http://localhost")
						.pathname;
					if (!pathname.startsWith("/_studio/routes/")) return next();
					if (!token || request.headers["x-fangyuan-studio-token"] !== token)
						return send(response, 403, { error: "Studio token 无效。" });
					if (pathname === "/_studio/routes/list" && request.method === "GET") {
						try {
							const current = readRouteSnapshot({ themeRoot });
							return send(response, 200, {
								routes: current.routes.map((route) => {
									const publicPath = publicRoutePath(
										route.publicPath,
										current.base,
									);
									return {
										path: route.sourcePath,
										contentId: route.contentId ?? null,
										currentPath: route.publicPath,
										currentUrl: current.site
											? new URL(publicPath, current.site).href
											: publicPath,
										history: route.contentId
											? (current.registry.documents[
													route.contentId
												]?.paths.filter(
													(value) => value !== route.publicPath,
												) ?? [])
											: [],
									};
								}),
							});
						} catch (error) {
							return send(response, 422, {
								error: error instanceof Error ? error.message : String(error),
							});
						}
					}
					if (
						request.method !== "POST" ||
						![
							"/_studio/routes/analyze",
							"/_studio/routes/prepare",
							"/_studio/routes/trash",
						].includes(pathname)
					)
						return send(response, 404, { error: "路由操作不存在。" });
					try {
						let body = "";
						for await (const chunk of request) {
							body += chunk;
							if (Buffer.byteLength(body) > 16 * 1024 * 1024)
								throw new Error("文章请求超过 16 MiB。");
						}
						const input = JSON.parse(body);
						if (
							typeof input.path !== "string" ||
							typeof input.source !== "string"
						)
							return send(response, 400, {
								error: "需要 path 和 source 字符串。",
							});
						const result = pathname.endsWith("/trash")
							? prepareArticleRetirement({
									themeRoot,
									path: input.path,
									source: input.source,
								})
							: analyzeArticleRoute({
									themeRoot,
									path: input.path,
									source: input.source,
									prepare: pathname.endsWith("/prepare"),
								});
						return send(
							response,
							!pathname.endsWith("/analyze") &&
								result.issues.some((issue) => issue.severity === "error")
								? 422
								: 200,
							result,
						);
					} catch (error) {
						return send(response, 422, {
							error: error instanceof Error ? error.message : String(error),
						});
					}
				});
			},
		},
	};
}
