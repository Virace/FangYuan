import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
	registerExternalSiteConfigWatch,
	registerExternalSiteDevWatch,
	resolveExternalSiteWatchPaths,
} from "../src/utils/site-source/dev-watch.mjs";

function fixtureSiteRoot() {
	return path.resolve("..", "fixture-sites", "x-item.com");
}

function createMockServer({ requireRefreshBeforeReload = false } = {}) {
	const handlers = new Map();
	const watchedPaths = [];
	const messages = [];
	const invalidatedEnvironments = [];
	const hotEvents = [];
	const restarts = [];
	const refreshes = [];
	const routeManifestCacheClears = [];
	let refreshCompleted = false;
	let routeManifestCacheCleared = false;
	let contentChangedSent = false;

	return {
		handlers,
		hotEvents,
		invalidatedEnvironments,
		messages,
		refreshes,
		routeManifestCacheClears,
		restarts,
		watchedPaths,
		clearContentRouteManifestCache() {
			routeManifestCacheClears.push(true);
			routeManifestCacheCleared = true;
		},
		async refreshContent(options) {
			refreshes.push(options ?? null);
			refreshCompleted = true;
		},
		server: {
			environments: {
				client: {
					moduleGraph: {
						invalidateAll() {
							if (requireRefreshBeforeReload) {
								assert.equal(refreshCompleted, true);
								assert.equal(routeManifestCacheCleared, true);
								assert.equal(contentChangedSent, true);
							}
							invalidatedEnvironments.push("client");
						},
					},
					hot: {
						send(message) {
							messages.push({ environment: "client", message });
						},
					},
				},
				ssr: {
					moduleGraph: {
						invalidateAll() {
							if (requireRefreshBeforeReload) {
								assert.equal(refreshCompleted, true);
								assert.equal(routeManifestCacheCleared, true);
								assert.equal(contentChangedSent, true);
							}
							invalidatedEnvironments.push("ssr");
						},
					},
					hot: {
						send(event, payload) {
							hotEvents.push({ environment: "ssr", event, payload });
							if (event === "astro:content-changed") {
								contentChangedSent = true;
							}
						},
					},
				},
			},
			restart() {
				restarts.push(true);
			},
			watcher: {
				add(paths) {
					watchedPaths.push(...paths);
				},
				on(eventName, handler) {
					handlers.set(eventName, handler);
				},
			},
		},
	};
}

test("external site dev watcher subscribes config, content, and assets", () => {
	const siteRoot = fixtureSiteRoot();

	assert.deepEqual(resolveExternalSiteWatchPaths(siteRoot), [
		path.join(siteRoot, "site.config.yaml"),
		path.join(siteRoot, "content"),
		path.join(siteRoot, "assets"),
	]);
});

test("external site dev watcher refreshes content before reloading", async () => {
	const siteRoot = fixtureSiteRoot();
	const mock = createMockServer({ requireRefreshBeforeReload: true });

	registerExternalSiteDevWatch({
		server: mock.server,
		siteRoot,
		enabled: true,
		refreshContent: mock.refreshContent,
		clearContentRouteManifestCache: mock.clearContentRouteManifestCache,
	});

	assert.deepEqual(mock.watchedPaths, resolveExternalSiteWatchPaths(siteRoot));

	const changeHandler = mock.handlers.get("all");
	assert.equal(typeof changeHandler, "function");

	await changeHandler(
		"change",
		path.join(siteRoot, "content", "posts", "hello.md"),
	);
	await changeHandler(
		"change",
		path.resolve("..", "fixture-sites", "other", "content", "post.md"),
	);

	assert.deepEqual(mock.refreshes, [null]);
	assert.deepEqual(mock.routeManifestCacheClears, [true]);
	assert.deepEqual(mock.hotEvents, [
		{ environment: "ssr", event: "astro:content-changed", payload: {} },
	]);
	assert.deepEqual(mock.invalidatedEnvironments, ["client", "ssr"]);
	assert.deepEqual(mock.messages, [
		{ environment: "client", message: { type: "full-reload", path: "*" } },
	]);
	assert.deepEqual(mock.restarts, []);
});

test("external site dev watcher leaves site config restart to Astro", () => {
	const siteRoot = fixtureSiteRoot();
	const mock = createMockServer();

	registerExternalSiteDevWatch({
		server: mock.server,
		siteRoot,
		enabled: true,
	});

	const changeHandler = mock.handlers.get("all");
	assert.equal(typeof changeHandler, "function");

	changeHandler("change", path.join(siteRoot, "site.config.yaml"));

	assert.deepEqual(mock.invalidatedEnvironments, []);
	assert.deepEqual(mock.messages, []);
	assert.deepEqual(mock.restarts, []);
});

test("external site config watch registers config as Astro watch file", () => {
	const siteRoot = fixtureSiteRoot();
	const watchedFiles = [];

	registerExternalSiteConfigWatch({
		addWatchFile(filePath) {
			watchedFiles.push(filePath);
		},
		enabled: true,
		siteRoot,
	});

	assert.deepEqual(watchedFiles, [path.join(siteRoot, "site.config.yaml")]);
});

test("external site dev watcher does nothing when disabled", () => {
	const mock = createMockServer();

	registerExternalSiteDevWatch({
		server: mock.server,
		siteRoot: fixtureSiteRoot(),
		enabled: false,
	});

	assert.deepEqual(mock.watchedPaths, []);
	assert.equal(mock.handlers.size, 0);
});
