import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");
const mockModule = await import(
	pathToFileURL(
		path.join(repoRoot, "src", "utils", "qingyan", "mock-api.mjs"),
	).href,
);

function createMockClient() {
	const backend = mockModule.createQingYanMockBackend();
	let cookieHeader = "";

	return {
		async request({ method = "GET", url, body }) {
			const response = await backend.handleRequest({
				method,
				url,
				headers: cookieHeader ? { cookie: cookieHeader } : {},
				body: body ? JSON.stringify(body) : "",
			});
			assert.ok(response, `expected mock response for ${method} ${url}`);
			const setCookie = response.headers["set-cookie"];
			if (setCookie) {
				cookieHeader = setCookie.split(";")[0];
			}

			return {
				status: response.status,
				headers: response.headers,
				json: JSON.parse(response.body),
			};
		},
	};
}

test("qingyan mock backend should expose a dedicated mock target switch", () => {
	assert.equal(mockModule.isQingYanMockTarget("mock"), true);
	assert.equal(mockModule.isQingYanMockTarget("http://localhost:4401"), false);
});

test("qingyan mock backend should simulate threshold captcha flow for comment create", async () => {
	const client = createMockClient();
	const bootstrap = await client.request({
		url: "/api/comments/bootstrap/?siteKey=fangyuan&pageKey=post:mock-comment&pageTitle=Mock+Comment",
	});
	assert.equal(bootstrap.status, 200);
	assert.equal(bootstrap.json.schemaVersion, "2026-05-31");
	assert.equal(bootstrap.json.features.commentCaptcha.enabled, true);
	assert.equal(bootstrap.json.data.comments.captcha.required, false);

	const blockedCreate = await client.request({
		method: "POST",
		url: "/api/comments/",
		body: {
			siteKey: "fangyuan",
			pageKey: "post:mock-comment",
			pageTitle: "Mock Comment",
			pageUrl: "http://localhost:4321/posts/mock-comment/",
			author: {
				name: "Frontend Tester",
				email: "tester@example.com",
			},
			content: {
				raw: "需要先触发验证码。",
			},
		},
	});
	assert.equal(blockedCreate.status, 400);
	assert.equal(blockedCreate.json.error.code, "COMMENT_CAPTCHA_REQUIRED");

	const captchaState = await client.request({
		url: "/api/comments/captcha/state/?siteKey=fangyuan&pageKey=post:mock-comment",
	});
	assert.equal(captchaState.status, 200);
	assert.equal(captchaState.json.required, true);
	assert.equal(captchaState.json.verified, false);
	assert.match(captchaState.json.challenge.imageData, /^data:image\/svg\+xml/);
	assert.doesNotMatch(captchaState.json.challenge.imageData, /2468/);

	const refreshedCaptchaState = await client.request({
		method: "POST",
		url: "/api/comments/captcha/refresh/",
		body: {
			siteKey: "fangyuan",
			pageKey: "post:mock-comment",
		},
	});
	assert.equal(refreshedCaptchaState.status, 200);
	assert.equal(refreshedCaptchaState.json.required, true);
	assert.notEqual(
		refreshedCaptchaState.json.challenge.challengeId,
		captchaState.json.challenge.challengeId,
	);
	assert.notEqual(
		refreshedCaptchaState.json.challenge.imageData,
		captchaState.json.challenge.imageData,
	);
	assert.doesNotMatch(refreshedCaptchaState.json.challenge.imageData, /2468/);

	const created = await client.request({
		method: "POST",
		url: "/api/comments/",
		body: {
			siteKey: "fangyuan",
			pageKey: "post:mock-comment",
			pageTitle: "Mock Comment",
			pageUrl: "http://localhost:4321/posts/mock-comment/",
			author: {
				name: "Frontend Tester",
				email: "tester@example.com",
			},
			content: {
				raw: "验证码通过后这条评论应该成功。",
			},
			captcha: {
				challengeId: refreshedCaptchaState.json.challenge.challengeId,
				value: "2468",
			},
		},
	});
	assert.equal(created.status, 200);
	assert.equal(created.json.comment.status, "approved");

	const thread = await client.request({
		url: "/api/comments/thread/?siteKey=fangyuan&pageKey=post:mock-comment&sortBy=newest&limit=5&offset=0",
	});
	assert.equal(thread.status, 200);
	assert.ok(thread.json.items.length >= 1);
	assert.equal(thread.json.pagination.rootCount >= 1, true);
});

test("qingyan mock backend should share captcha state with like flow and blacklist after repeated invalid captcha", async () => {
	const client = createMockClient();
	const pageUrl =
		"http://localhost:4321/posts/mock-like/?qingyanMockBanAfter=2&qingyanMockThreshold=1";

	await client.request({
		url: `/api/comments/bootstrap/?siteKey=fangyuan&pageKey=post:mock-like&pageTitle=Mock+Like&pageUrl=${encodeURIComponent(pageUrl)}`,
	});

	const blockedLike = await client.request({
		method: "POST",
		url: "/api/page-feedback/like/",
		body: {
			siteKey: "fangyuan",
			pageKey: "post:mock-like",
			pageTitle: "Mock Like",
			pageUrl,
		},
	});
	assert.equal(blockedLike.status, 400);
	assert.equal(blockedLike.json.error.code, "PAGE_FEEDBACK_CAPTCHA_REQUIRED");

	const captchaState = await client.request({
		url: `/api/comments/captcha/state/?siteKey=fangyuan&pageKey=post:mock-like&pageUrl=${encodeURIComponent(pageUrl)}`,
	});
	assert.equal(captchaState.status, 200);
	assert.equal(captchaState.json.required, true);

	const invalidOnce = await client.request({
		method: "POST",
		url: "/api/page-feedback/like/",
		body: {
			siteKey: "fangyuan",
			pageKey: "post:mock-like",
			pageTitle: "Mock Like",
			pageUrl,
			captcha: {
				challengeId: captchaState.json.challenge.challengeId,
				value: "0000",
			},
		},
	});
	assert.equal(invalidOnce.status, 400);
	assert.equal(invalidOnce.json.error.code, "COMMENT_CAPTCHA_INVALID");

	const blacklisted = await client.request({
		method: "POST",
		url: "/api/page-feedback/like/",
		body: {
			siteKey: "fangyuan",
			pageKey: "post:mock-like",
			pageTitle: "Mock Like",
			pageUrl,
			captcha: {
				challengeId: captchaState.json.challenge.challengeId,
				value: "1111",
			},
		},
	});
	assert.equal(blacklisted.status, 403);
	assert.equal(blacklisted.json.error.code, "COMMENT_BLACKLISTED");

	const blockedAfterBlacklist = await client.request({
		method: "POST",
		url: "/api/page-feedback/like/",
		body: {
			siteKey: "fangyuan",
			pageKey: "post:mock-like",
			pageTitle: "Mock Like",
			pageUrl,
		},
	});
	assert.equal(blockedAfterBlacklist.status, 403);
	assert.equal(blockedAfterBlacklist.json.error.code, "COMMENT_BLACKLISTED");
});

test("qingyan mock backend should expose fixed seeded comments for captcha and fake blacklist vote testing", async () => {
	const client = createMockClient();
	const pageUrl =
		"http://localhost:4321/posts/test-pagination/pagination-test-29/";
	const pageKey = "test-pagination/pagination-test-29";

	const bootstrap = await client.request({
		url: `/api/comments/bootstrap/?siteKey=fangyuan&pageKey=${encodeURIComponent(pageKey)}&pageTitle=Fixed+Vote&pageUrl=${encodeURIComponent(pageUrl)}`,
	});
	assert.equal(bootstrap.status, 200);
	assert.equal(bootstrap.json.data.comments.items.length >= 2, true);

	const captchaCommentId = "c_test-pagination/pagination-test-29_root_1";
	const blacklistCommentId = "c_test-pagination/pagination-test-29_root_2";

	const captchaBlockedVote = await client.request({
		method: "POST",
		url: `/api/comments/${captchaCommentId}/vote/`,
		body: {
			siteKey: "fangyuan",
			pageKey,
			choice: "up",
		},
	});
	assert.equal(captchaBlockedVote.status, 400);
	assert.equal(captchaBlockedVote.json.error.code, "VOTE_CAPTCHA_REQUIRED");

	const captchaState = await client.request({
		url: `/api/comments/captcha/state/?siteKey=fangyuan&pageKey=${encodeURIComponent(pageKey)}&pageUrl=${encodeURIComponent(pageUrl)}`,
	});
	assert.equal(captchaState.status, 200);
	assert.equal(captchaState.json.required, true);

	const votedAfterVerify = await client.request({
		method: "POST",
		url: `/api/comments/${captchaCommentId}/vote/`,
		body: {
			siteKey: "fangyuan",
			pageKey,
			choice: "up",
			captcha: {
				challengeId: captchaState.json.challenge.challengeId,
				value: "2468",
			},
		},
	});
	assert.equal(votedAfterVerify.status, 200);
	assert.equal(votedAfterVerify.json.commentId, captchaCommentId);
	assert.equal(votedAfterVerify.json.vote.viewer, "up");

	const fakeBlacklistedVote = await client.request({
		method: "POST",
		url: `/api/comments/${blacklistCommentId}/vote/`,
		body: {
			siteKey: "fangyuan",
			pageKey,
			choice: "up",
		},
	});
	assert.equal(fakeBlacklistedVote.status, 403);
	assert.equal(fakeBlacklistedVote.json.error.code, "COMMENT_BLACKLISTED");
});

test("qingyan mock backend should accept startup defaults for seed richness and captcha mode", async () => {
	const backend = mockModule.createQingYanMockBackend({
		defaults: {
			captchaMode: "always",
			thresholdMaxActions: 3,
			seedMode: "dense",
			commentCount: 8,
			basePageViewCount: 42,
			baseLikeCount: 5,
			answer: "1357",
		},
	});

	const bootstrapResponse = await backend.handleRequest({
		method: "GET",
		url: "/api/comments/bootstrap/?siteKey=fangyuan&pageKey=post:startup-defaults&pageTitle=Startup+Defaults",
		headers: {},
		body: "",
	});
	assert.ok(bootstrapResponse);
	const bootstrap = JSON.parse(bootstrapResponse.body);

	assert.equal(bootstrap.data.comments.captcha.required, true);
	assert.equal(
		bootstrap.data.comments.captcha.challenge.challengeId.startsWith("cap_"),
		true,
	);
	assert.equal(bootstrap.data.pageViews.count, 43);
	assert.equal(bootstrap.data.pageLikes.count, 5);
	assert.equal(bootstrap.data.comments.items.length >= 5, true);
	assert.equal(bootstrap.data.comments.pagination.rootCount >= 5, true);
});
