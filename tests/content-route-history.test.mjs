import assert from "node:assert/strict";
import test from "node:test";
import { appendRoutePaths, emptyRouteRegistry, inspectContentRoutes, parseRouteRegistry, publicRoutePath, renderHistoryRedirect } from "../src/utils/content-route-history.ts";
import { ensureArticleContentId } from "../src/utils/content-route-store.ts";

const article = (publicPath, contentId = "article-one", sourcePath = "content/posts/one.md") => ({ publicPath, contentId, sourcePath, published: true });

test("confirmed a to b to c retains both old addresses and resolves them directly to c", () => {
	let registry = emptyRouteRegistry();
	for (const routePath of ["/a.html", "/b.html", "/c.html"]) registry = appendRoutePaths(registry, "article-one", [routePath]);
	const result = inspectContentRoutes({ routes: [article("/c.html")], registry });
	assert.deepEqual(result.issues, []);
	assert.deepEqual(result.redirects.map(({ publicPath, targetPath, outputPath }) => ({ publicPath, targetPath, outputPath })), [
		{ publicPath: "/a.html", targetPath: "/c.html", outputPath: "a.html" },
		{ publicPath: "/b.html", targetPath: "/c.html", outputPath: "b.html" },
	]);
	const restored = inspectContentRoutes({ routes: [article("/a.html")], registry });
	assert.deepEqual(restored.issues, []);
	assert.deepEqual(restored.redirects.map(({ publicPath, targetPath }) => [publicPath, targetPath]), [["/b.html", "/a.html"], ["/c.html", "/a.html"]]);
});

test("another article cannot acquire a historical address and missing identities stop the build", () => {
	const registry = appendRoutePaths(emptyRouteRegistry(), "article-one", ["/a.html", "/b.html"]);
	const conflict = inspectContentRoutes({ routes: [article("/b.html"), article("/a.html", "article-two", "content/posts/two.md")], registry });
	assert.ok(conflict.issues.some((issue) => issue.code === "path-owned" && issue.ownerId === "article-one"));
	assert.ok(inspectContentRoutes({ routes: [], registry }).issues.some((issue) => issue.code === "missing-identity"));
	assert.ok(inspectContentRoutes({ routes: [article("/c.html")], registry }).issues.some((issue) => issue.code === "registry-outdated"));
});

test("retired articles retain address ownership and restoration reactivates their redirects", () => {
	const registry = parseRouteRegistry({
		version: 1,
		documents: { "article-one": { paths: ["/a.html", "/b.html"], retired: true } },
	});
	assert.deepEqual(inspectContentRoutes({ routes: [], registry }), { issues: [], redirects: [] });
	const conflict = inspectContentRoutes({ routes: [article("/a.html", "article-two", "content/posts/two.md")], registry });
	assert.ok(conflict.issues.some((issue) => issue.code === "path-owned" && issue.ownerId === "article-one"));
	assert.ok(inspectContentRoutes({ routes: [article("/b.html")], registry }).issues.some((issue) => issue.code === "retired-identity"));
	const restored = inspectContentRoutes({ routes: [article("/b.html")], registry: appendRoutePaths(registry, "article-one", ["/b.html"]) });
	assert.deepEqual(restored.issues, []);
	assert.deepEqual(restored.redirects.map(({ publicPath, targetPath }) => [publicPath, targetPath]), [["/a.html", "/b.html"]]);
	assert.equal(registry.documents["article-one"].retired, true);
});

test("output materialization rejects directory, file, case and encoded collisions", () => {
	for (const [first, second] of [["/x/", "/x/index.html"], ["/x.html", "/x.html/y.html"], ["/X.html", "/x.html"], ["/中文.html", "/%E4%B8%AD%E6%96%87.html"]]) {
		const result = inspectContentRoutes({ routes: [article(first), article(second, "article-two", "content/posts/two.md")], registry: emptyRouteRegistry(), requireRegistry: false });
		assert.ok(result.issues.some((issue) => issue.code === "output-conflict"), `${first} vs ${second}`);
	}
});

test("legacy content remains readable and draft paths still reserve ownership", () => {
	assert.deepEqual(inspectContentRoutes({ routes: [{ ...article("/legacy.html"), contentId: undefined }], registry: emptyRouteRegistry() }).issues, []);
	const result = inspectContentRoutes({ routes: [article("/same.html"), { ...article("/same.html", "article-two", "content/posts/draft.md"), published: false }], registry: emptyRouteRegistry(), requireRegistry: false });
	assert.ok(result.issues.some((issue) => issue.code === "path-owned"));
});

test("returning to draft suspends redirects while keeping historical addresses reserved", () => {
	const registry = appendRoutePaths(emptyRouteRegistry(), "article-one", ["/a.html", "/b.html"]);
	const published = article("/b.html");
	const draft = { ...published, published: false };
	assert.deepEqual(inspectContentRoutes({ routes: [draft], registry }), { issues: [], redirects: [] });
	const conflict = inspectContentRoutes({
		routes: [draft, article("/a.html", "article-two", "content/posts/two.md")],
		registry,
		requireRegistry: false,
	});
	assert.ok(conflict.issues.some((issue) => issue.code === "path-owned" && issue.ownerId === "article-one"));
	const restored = inspectContentRoutes({ routes: [published], registry });
	assert.deepEqual(restored.issues, []);
	assert.deepEqual(restored.redirects.map(({ publicPath, targetPath }) => [publicPath, targetPath]), [["/a.html", "/b.html"]]);
});

test("reserved and unsafe output paths fail and duplicate identities remain explicit", () => {
	for (const publicPath of ["/rss.xml", "/rss.xml/", "/archive/index.html", "/robots.txt", "/content-index.json", "/static/code.js", "/page/2/", "/../escape.html", "/%2e%2e/escape.html"]) {
		assert.ok(inspectContentRoutes({ routes: [article(publicPath)], registry: emptyRouteRegistry(), requireRegistry: false }).issues.some((issue) => issue.severity === "error"), publicPath);
	}
	assert.ok(inspectContentRoutes({ routes: [article("/one.html"), article("/two.html", "article-one", "content/posts/copy.md")], registry: emptyRouteRegistry(), requireRegistry: false }).issues.some((issue) => issue.code === "duplicate-id"));
});

test("first takeover adds only the contentId line while retaining original frontmatter and body bytes", () => {
	const source = '\uFEFF---\r\ntitle: "文章" # 保留注释\r\npublished: 2026-01-01\r\n---\r\n\r\n正文\r\n';
	const result = ensureArticleContentId(source, "stable-one");
	assert.equal(result.source, '\uFEFF---\r\ncontentId: stable-one\r\n' + source.slice('\uFEFF---\r\n'.length));
	assert.deepEqual(ensureArticleContentId(result.source, "different"), result);
});

test("redirect markup contains static migration and safely carries query and fragment", () => {
	const html = renderHistoryRedirect("/blog/c.html", "https://example.test/blog/c.html");
	assert.match(html, /http-equiv="refresh" content="0;url=\/blog\/c.html"/);
	assert.match(html, /rel="canonical" href="https:\/\/example.test\/blog\/c.html"/);
	assert.match(html, /location\.replace\("\/blog\/c.html"\+location\.search\+location\.hash\)/);
	assert.equal(publicRoutePath("/c.html", "/blog/"), "/blog/c.html");
});
