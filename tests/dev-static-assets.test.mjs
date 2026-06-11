import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";
import test from "node:test";

import {
	createDevStaticAssetMiddleware,
	resolveAstroDevToolbarSourcemapPath,
} from "../src/utils/site-source/dev-static-assets.mjs";

class MockResponse extends Writable {
	constructor() {
		super();
		this.statusCode = 200;
		this.headers = new Map();
		this.chunks = [];
		this.done = new Promise((resolve) => {
			this.on("finish", resolve);
		});
	}

	_write(chunk, _encoding, callback) {
		this.chunks.push(Buffer.from(chunk));
		callback();
	}

	setHeader(name, value) {
		this.headers.set(name.toLowerCase(), value);
	}

	body() {
		return Buffer.concat(this.chunks).toString("utf8");
	}
}

function createMiddleware(options) {
	return createDevStaticAssetMiddleware({
		externalSiteAssetDevPrefix: "/__fangyuan-site-assets/",
		getMimeType: () => "image/png",
		isExternalSiteAsset: (value) =>
			value.startsWith("assets/") && value.endsWith(".png"),
		...options,
	});
}

test("dev toolbar sourcemap request maps to Vite dependency cache", async (t) => {
	const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-dev-map-"));
	t.after(() => rm(fixtureRoot, { recursive: true, force: true }));

	const expectedPath = path.join(
		fixtureRoot,
		"node_modules",
		".vite",
		"deps",
		"astro_runtime_client_dev-toolbar_entrypoint__js.js.map",
	);
	const requestPath =
		"/@id/astro/runtime/client/dev-toolbar/astro_runtime_client_dev-toolbar_entrypoint__js.js.map?direct";

	assert.equal(
		resolveAstroDevToolbarSourcemapPath(requestPath, { cwd: fixtureRoot }),
		expectedPath,
	);
});

test("dev static middleware serves existing dev toolbar sourcemaps before Astro routes", async (t) => {
	const fixtureRoot = await mkdtemp(
		path.join(os.tmpdir(), "fangyuan-dev-static-"),
	);
	t.after(() => rm(fixtureRoot, { recursive: true, force: true }));

	const mapPath = path.join(
		fixtureRoot,
		"node_modules",
		".vite",
		"deps",
		"astro_runtime_client_dev-toolbar_entrypoint__js.js.map",
	);
	await mkdir(path.dirname(mapPath), { recursive: true });
	await writeFile(mapPath, '{"version":3}', "utf8");

	const middleware = createMiddleware({
		cwd: fixtureRoot,
		externalSiteRoot: path.join(fixtureRoot, "site"),
	});
	const response = new MockResponse();
	let nextCalled = false;

	middleware(
		{
			url: "/@id/astro/runtime/client/dev-toolbar/astro_runtime_client_dev-toolbar_entrypoint__js.js.map",
		},
		response,
		() => {
			nextCalled = true;
		},
	);
	await response.done;

	assert.equal(nextCalled, false);
	assert.equal(response.statusCode, 200);
	assert.equal(response.headers.get("content-type"), "application/json");
	assert.equal(response.body(), '{"version":3}');
});

test("dev static middleware returns quiet 404 for missing external site assets", async (t) => {
	const fixtureRoot = await mkdtemp(
		path.join(os.tmpdir(), "fangyuan-dev-external-"),
	);
	t.after(() => rm(fixtureRoot, { recursive: true, force: true }));

	const middleware = createMiddleware({
		externalSiteRoot: path.join(fixtureRoot, "site"),
	});
	const response = new MockResponse();
	let nextCalled = false;

	middleware(
		{ url: "/__fangyuan-site-assets/assets/images/missing.png" },
		response,
		() => {
			nextCalled = true;
		},
	);
	await response.done;

	assert.equal(nextCalled, false);
	assert.equal(response.statusCode, 404);
	assert.equal(response.body(), "Not Found");
});
