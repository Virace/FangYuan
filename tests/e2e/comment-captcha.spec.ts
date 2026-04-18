import { expect, test, type Page } from "@playwright/test";
import {
	VIEWPORTS,
	prepareStablePage,
} from "./support/site-fixtures";

const COMMENT_TEST_ROUTE = "/posts/welcome/";

type RawComment = {
	id: string;
	parentId: string | null;
	author: {
		name: string;
		website?: string | null;
	};
	content: {
		raw: string;
		html: string;
	};
	status: "approved" | "pending";
	isPinned: boolean;
	isFolded: boolean;
	replyCount: number;
	voteUp: number;
	voteDown: number;
	viewerVote: "up" | "down" | null;
	createdAt: string;
	updatedAt: string | null;
	children: RawComment[];
};

function createCaptchaImage(label: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><rect width="160" height="60" rx="8" fill="#f4f7fb"/><text x="80" y="38" text-anchor="middle" font-size="28" fill="#111827">${label}</text></svg>`;
	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildCaptchaState(challengeId: string, imageData: string) {
	return {
		required: true,
		verified: false,
		mode: "inline_value",
		challenge: {
			challengeId,
			mode: "inline_value",
			imageData,
		},
	};
}

function buildBootstrapResponse(input?: {
	comments?: RawComment[];
	likeCount?: number;
	liked?: boolean;
}) {
	return {
		capability: {
			enabled: true,
			supportsReply: true,
			supportsVote: true,
			supportsCaptcha: true,
			defaultStatus: "approved",
		},
		commentForm: {
			allow: ["nickname", "email", "website"],
			require: ["nickname", "email"],
		},
		thread: {
			siteKey: "default",
			pageKey: "welcome",
			pageTitle: "Welcome",
		},
		pagination: {
			sortBy: "newest",
			limit: 5,
			offset: 0,
			totalCount: input?.comments?.length ?? 0,
			rootCount: input?.comments?.length ?? 0,
		},
		comments: input?.comments ?? [],
		pageMetrics: {
			pageViewCount: 12,
		},
		pageFeedback: {
			supportsLike: true,
			likeCount: input?.likeCount ?? 0,
			liked: input?.liked ?? false,
		},
		captcha: {
			required: false,
			verified: false,
			mode: null,
			challenge: null,
		},
	};
}

function buildThreadResponse(comments: RawComment[] = []) {
	return {
		thread: {
			siteKey: "default",
			pageKey: "welcome",
			pageTitle: "Welcome",
		},
		pagination: {
			sortBy: "newest",
			limit: 5,
			offset: 0,
			totalCount: comments.length,
			rootCount: comments.length,
		},
		comments,
	};
}

function createCommentFixture(): RawComment {
	return {
		id: "comment-1",
		parentId: null,
		author: {
			name: "青砚",
			website: null,
		},
		content: {
			raw: "这是一条联调用评论。",
			html: "<p>这是一条联调用评论。</p>",
		},
		status: "approved",
		isPinned: false,
		isFolded: false,
		replyCount: 0,
		voteUp: 3,
		voteDown: 0,
		viewerVote: null,
		createdAt: "2026-04-18T09:00:00.000Z",
		updatedAt: null,
		children: [],
	};
}

async function installFetchMock(page: Page, input: {
	bootstrap: ReturnType<typeof buildBootstrapResponse>;
	thread?: ReturnType<typeof buildThreadResponse>;
	captchaState?: ReturnType<typeof buildCaptchaState>;
	refreshedCaptchaState?: ReturnType<typeof buildCaptchaState>;
	commentCreate?:
		| {
				firstErrorCode: string;
				firstErrorMessage: string;
				successBody: unknown;
		  }
		| undefined;
	pageLike?:
		| {
				firstErrorCode: string;
				firstErrorMessage: string;
				successBody: unknown;
		  }
		| undefined;
	commentVote?:
		| {
				firstErrorCode: string;
				firstErrorMessage: string;
				successBody: unknown;
		  }
		| undefined;
}) {
	await page.addInitScript((config) => {
		const originalFetch = window.fetch.bind(window);
		const jsonResponse = (body: unknown, status = 200) =>
			new Response(JSON.stringify(body), {
				status,
				headers: {
					"Content-Type": "application/json",
				},
			});

		(window as typeof window & {
			__commentTestState: Record<string, unknown>;
		}).__commentTestState = {
			commentSubmitCount: 0,
			commentRetryBody: null,
			likeCount: 0,
			likeRetryBody: null,
			voteCount: 0,
			voteRetryBody: null,
			captchaStateCount: 0,
			refreshCount: 0,
		};

		window.fetch = async (inputArg, init) => {
			const requestUrl =
				typeof inputArg === "string"
					? inputArg
					: inputArg instanceof Request
						? inputArg.url
						: String(inputArg);
			const url = new URL(requestUrl, window.location.origin);
			const method = (
				init?.method ??
				(inputArg instanceof Request ? inputArg.method : "GET")
			).toUpperCase();

			if (!url.pathname.startsWith("/api/")) {
				return originalFetch(inputArg, init);
			}

			const testState = (
				window as typeof window & {
					__commentTestState: Record<string, unknown>;
				}
			).__commentTestState;
			const requestBody = init?.body ? JSON.parse(String(init.body)) : null;

			if (url.pathname === "/api/comments/bootstrap/" && method === "GET") {
				return jsonResponse(config.bootstrap);
			}

			if (url.pathname === "/api/comments/thread/" && method === "GET") {
				return jsonResponse(config.thread ?? config.bootstrap.comments ?? []);
			}

			if (url.pathname === "/api/comments/captcha/state/" && method === "GET") {
				testState.captchaStateCount =
					Number(testState.captchaStateCount ?? 0) + 1;
				return jsonResponse(config.captchaState);
			}

			if (
				url.pathname === "/api/comments/captcha/refresh/" &&
				method === "POST"
			) {
				testState.refreshCount = Number(testState.refreshCount ?? 0) + 1;
				return jsonResponse(config.refreshedCaptchaState ?? config.captchaState);
			}

			if (url.pathname === "/api/comments/" && method === "POST") {
				testState.commentSubmitCount =
					Number(testState.commentSubmitCount ?? 0) + 1;
				if (Number(testState.commentSubmitCount) === 1 && config.commentCreate) {
					return jsonResponse(
						{
							error: {
								code: config.commentCreate.firstErrorCode,
								message: config.commentCreate.firstErrorMessage,
							},
						},
						400,
					);
				}

				testState.commentRetryBody = requestBody;
				return jsonResponse(config.commentCreate?.successBody ?? {});
			}

			if (url.pathname === "/api/page-feedback/like/" && method === "POST") {
				testState.likeCount = Number(testState.likeCount ?? 0) + 1;
				if (Number(testState.likeCount) === 1 && config.pageLike) {
					return jsonResponse(
						{
							error: {
								code: config.pageLike.firstErrorCode,
								message: config.pageLike.firstErrorMessage,
							},
						},
						400,
					);
				}

				testState.likeRetryBody = requestBody;
				return jsonResponse(config.pageLike?.successBody ?? {});
			}

			if (
				url.pathname === "/api/comments/comment-1/vote/" &&
				method === "POST"
			) {
				testState.voteCount = Number(testState.voteCount ?? 0) + 1;
				if (Number(testState.voteCount) === 1 && config.commentVote) {
					return jsonResponse(
						{
							error: {
								code: config.commentVote.firstErrorCode,
								message: config.commentVote.firstErrorMessage,
							},
						},
						400,
					);
				}

				testState.voteRetryBody = requestBody;
				return jsonResponse(config.commentVote?.successBody ?? {});
			}

			return jsonResponse(
				{
					error: {
						code: "TEST_UNHANDLED_API",
						message: `${method} ${url.pathname}`,
					},
				},
				500,
			);
		};
	}, input);
}

async function readTestState(page: Page) {
	return page.evaluate(() => {
		return (
			window as typeof window & {
				__commentTestState: Record<string, unknown>;
			}
		).__commentTestState;
	});
}

test("comment submit should keep captcha attached to the original action", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	const initialCaptcha = buildCaptchaState(
		"challenge-comment-initial",
		createCaptchaImage("2468"),
	);
	const refreshedCaptcha = buildCaptchaState(
		"challenge-comment-refreshed",
		createCaptchaImage("1357"),
	);

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse(),
		thread: buildThreadResponse(),
		captchaState: initialCaptcha,
		refreshedCaptchaState: refreshedCaptcha,
		commentCreate: {
			firstErrorCode: "COMMENT_CAPTCHA_REQUIRED",
			firstErrorMessage: "请输入验证码。",
			successBody: {
				comment: {
					id: "created-comment",
					status: "approved",
					message: "评论已发布。",
				},
				thread: {
					commentCount: 1,
					rootCommentCount: 1,
				},
			},
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const composer = page.locator('section[data-post-title] form');
	await composer.locator('input[type="text"]').first().fill("Smoke Tester");
	await composer.locator('input[type="email"]').fill("smoke@example.com");
	await composer.locator("textarea").fill("验证码弹层 smoke test");

	await composer.getByRole("button", { name: "发表评论" }).click();
	await expect
		.poll(async () => Number((await readTestState(page)).commentSubmitCount))
		.toBe(1);

	const composerCaptcha = page.locator(
		'[data-comment-captcha-target="composer"] .comment-captcha-popover',
	);
	await expect(composerCaptcha).toBeVisible();
	await expect(
		composer.getByRole("button", { name: "验证验证码" }),
	).toHaveCount(0);

	await composer.getByRole("button", { name: "发表评论" }).click();
	await expect
		.poll(async () => Number((await readTestState(page)).commentSubmitCount))
		.toBe(1);
	await expect(composer).toContainText("请输入验证码。");

	const captchaImage = composerCaptcha.locator("img");
	await expect(captchaImage).toHaveAttribute("src", initialCaptcha.challenge.imageData);

	await composerCaptcha.getByRole("button", { name: "刷新验证码" }).click();
	await expect
		.poll(async () => Number((await readTestState(page)).refreshCount))
		.toBe(1);
	await expect(captchaImage).toHaveAttribute(
		"src",
		refreshedCaptcha.challenge.imageData,
	);

	await composerCaptcha.locator('input[inputmode="numeric"]').fill("1357");
	await composer.getByRole("button", { name: "发表评论" }).click();

	await expect
		.poll(async () => Number((await readTestState(page)).commentSubmitCount))
		.toBe(2);
	await expect(page.getByText("验证码弹层 smoke test")).toBeVisible();
	await expect(composerCaptcha).toHaveCount(0);

	const testState = await readTestState(page);
	expect(testState.commentRetryBody).toMatchObject({
		captcha: {
			challengeId: refreshedCaptcha.challenge.challengeId,
			value: "1357",
		},
	});
});

test("page like should retry with captcha on the same button", async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	const likeCaptcha = buildCaptchaState(
		"challenge-like",
		createCaptchaImage("2468"),
	);

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse({
			likeCount: 1,
		}),
		thread: buildThreadResponse(),
		captchaState: likeCaptcha,
		pageLike: {
			firstErrorCode: "PAGE_FEEDBACK_CAPTCHA_REQUIRED",
			firstErrorMessage: "请输入验证码。",
			successBody: {
				pageFeedback: {
					supportsLike: true,
					likeCount: 2,
					liked: true,
				},
			},
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const feedbackCard = page.locator("section").filter({ hasText: "支持这篇文章" }).first();
	const likeButton = feedbackCard.getByRole("button", { name: /点赞/ }).first();

	await likeButton.click();
	await expect
		.poll(async () => Number((await readTestState(page)).likeCount))
		.toBe(1);

	const likeCaptchaPopover = page.locator(
		'[data-page-feedback-captcha-target="like"] .comment-captcha-popover',
	);
	await expect(likeCaptchaPopover).toBeVisible();
	await expect(
		likeCaptchaPopover.getByRole("button", { name: "验证验证码" }),
	).toHaveCount(0);

	await likeButton.click();
	await expect
		.poll(async () => Number((await readTestState(page)).likeCount))
		.toBe(1);
	await expect(page.getByText("请输入验证码。")).toBeVisible();

	await likeCaptchaPopover.locator('input[inputmode="numeric"]').fill("2468");
	await likeButton.click();

	await expect
		.poll(async () => Number((await readTestState(page)).likeCount))
		.toBe(2);

	const testState = await readTestState(page);
	expect(testState.likeRetryBody).toMatchObject({
		captcha: {
			challengeId: likeCaptcha.challenge.challengeId,
			value: "2468",
		},
	});
});

test("comment vote should preserve confirmation flow and retry with inline captcha", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	const seededComment = createCommentFixture();
	const voteCaptcha = buildCaptchaState(
		"challenge-vote",
		createCaptchaImage("2468"),
	);

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse({
			comments: [seededComment],
		}),
		thread: buildThreadResponse([seededComment]),
		captchaState: voteCaptcha,
		commentVote: {
			firstErrorCode: "VOTE_CAPTCHA_REQUIRED",
			firstErrorMessage: "请输入验证码。",
			successBody: {
				commentId: "comment-1",
				voteUp: 4,
				voteDown: 0,
				viewerVote: "up",
			},
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const voteButton = page.locator('button[aria-label="点赞"]').first();
	await voteButton.click();

	const confirmPopover = page.locator(
		'[data-comment-vote-confirm-target="comment-1"] .comment-vote-popover',
	);
	await expect(confirmPopover).toBeVisible();

	await confirmPopover.locator("button").first().click();
	await expect
		.poll(async () => Number((await readTestState(page)).voteCount))
		.toBe(1);

	const voteCaptchaPopover = page.locator(
		'[data-comment-captcha-target="comment-1"] .comment-captcha-popover',
	);
	await expect(voteCaptchaPopover).toBeVisible();

	await voteButton.click();
	await expect
		.poll(async () => Number((await readTestState(page)).voteCount))
		.toBe(1);
	await expect(page.getByText("请输入验证码。")).toBeVisible();

	await voteCaptchaPopover.locator('input[inputmode="numeric"]').fill("2468");
	await voteButton.click();

	await expect
		.poll(async () => Number((await readTestState(page)).voteCount))
		.toBe(2);
	await expect(voteButton).toContainText("4");

	const testState = await readTestState(page);
	expect(testState.voteRetryBody).toMatchObject({
		captcha: {
			challengeId: voteCaptcha.challenge.challengeId,
			value: "2468",
		},
	});
});
