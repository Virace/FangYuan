import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
	registerExternalSiteDevWatch,
	resolveExternalSiteWatchPaths,
} from "../src/utils/external-site-dev-watch.mjs";

function createMockServer() {
	const handlers = new Map();
	const watchedPaths = [];
	const messages = [];
	const invalidatedEnvironments = [];
	const restarts = [];

	return {
		handlers,
		invalidatedEnvironments,
		messages,
		restarts,
		watchedPaths,
		server: {
			environments: {
				client: {
					moduleGraph: {
						invalidateAll() {
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
							invalidatedEnvironments.push("ssr");
						},
					},
					hot: {
						send(message) {
							messages.push({ environment: "ssr", message });
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

test("external site dev watcher only watches config, content, and assets", () => {
	const siteRoot = path.resolve("E:/Project/Activate/x-item.com");

	assert.deepEqual(resolveExternalSiteWatchPaths(siteRoot), [
		path.join(siteRoot, "site.config.yaml"),
		path.join(siteRoot, "content"),
		path.join(siteRoot, "assets"),
	]);
});

test("external site dev watcher reloads for external files only", () => {
	const siteRoot = path.resolve("E:/Project/Activate/x-item.com");
	const mock = createMockServer();

	registerExternalSiteDevWatch({
		server: mock.server,
		siteRoot,
		enabled: true,
	});

	assert.deepEqual(mock.watchedPaths, resolveExternalSiteWatchPaths(siteRoot));

	const changeHandler = mock.handlers.get("all");
	assert.equal(typeof changeHandler, "function");

	changeHandler("change", path.join(siteRoot, "content", "posts", "hello.md"));
	changeHandler("change", path.resolve("E:/Project/Activate/other/content/post.md"));

	assert.deepEqual(mock.invalidatedEnvironments, ["client", "ssr"]);
	assert.deepEqual(mock.messages, [
		{ environment: "client", message: { type: "full-reload", path: "*" } },
	]);
	assert.deepEqual(mock.restarts, []);
});

test("external site dev watcher restarts when site config changes", () => {
	const siteRoot = path.resolve("E:/Project/Activate/x-item.com");
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
	assert.deepEqual(mock.restarts, [true]);
});

test("external site dev watcher does nothing when disabled", () => {
	const mock = createMockServer();

	registerExternalSiteDevWatch({
		server: mock.server,
		siteRoot: path.resolve("E:/Project/Activate/x-item.com"),
		enabled: false,
	});

	assert.deepEqual(mock.watchedPaths, []);
	assert.equal(mock.handlers.size, 0);
});
