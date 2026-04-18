import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");
const proxyModule = await import(
	pathToFileURL(
		path.join(repoRoot, "src", "utils", "qingyan", "dev-proxy.mjs"),
	).href
);

test("qingyan dev proxy should normalize API request paths for Astro trailingSlash always mode", () => {
	assert.equal(
		proxyModule.normalizeQingYanDevProxyRequestPath(
			"/api/comments/bootstrap?siteKey=fangyuan&pageKey=welcome",
		),
		"/api/comments/bootstrap/?siteKey=fangyuan&pageKey=welcome",
	);
	assert.equal(
		proxyModule.normalizeQingYanDevProxyRequestPath("/api/comments/c_vote/vote"),
		"/api/comments/c_vote/vote/",
	);
	assert.equal(
		proxyModule.normalizeQingYanDevProxyPath(
			"/api/comments/bootstrap?siteKey=fangyuan&pageKey=welcome",
		),
		"/api/comments/bootstrap?siteKey=fangyuan&pageKey=welcome",
	);
	assert.equal(
		proxyModule.normalizeQingYanDevProxyPath("/api/page-feedback/like"),
		"/api/page-feedback/like",
	);
});
