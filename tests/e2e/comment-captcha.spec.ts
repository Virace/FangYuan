import { expect, type Page, test } from "@playwright/test";
import { prepareStablePage, VIEWPORTS } from "./support/site-fixtures";

const COMMENT_TEST_ROUTE = "/extra/";
const COMMENTER_PROFILE_STORAGE_KEY = "qingyan:commenter-profile:v1:default";
const CREATED_COMMENT_TIMESTAMP = "2026-05-28T00:00:00.000Z";

type RawComment = {
	id: string;
	parentId: string | null;
	author: {
		name: string;
		website?: string | null;
		avatarUrl?: string | null;
		badge?: {
			label: string;
		} | null;
	};
	content: {
		raw: string;
		html: string;
	};
	status: "approved" | "pending";
	isPinned: boolean;
	isFolded: boolean;
	replyCount: number;
	vote?: {
		up: number;
		down: number;
		viewer?: "up" | "down" | null;
	};
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
	pageMetricsEnabled?: boolean;
	supportsLike?: boolean;
	supportsVote?: boolean;
	viewer?: {
		verifiedAuthor?: {
			displayName: string;
			badgeLabel: string;
		};
	};
}) {
	const comments = input?.comments ?? [];
	const commentsEnabled = true;
	const pageViewsEnabled = input?.pageMetricsEnabled ?? true;
	const pageLikesEnabled = input?.supportsLike ?? true;
	const commentVotesEnabled = input?.supportsVote ?? true;
	return {
		schemaVersion: "2026-05-31",
		site: {
			siteKey: "default",
		},
		page: {
			pageKey: "welcome",
			status: "active",
		},
		features: {
			comments: { enabled: commentsEnabled },
			commentReplies: { enabled: true, maxDepth: 3 },
			commentVotes: commentVotesEnabled
				? { enabled: true }
				: { enabled: false, reason: "feature_disabled" },
			commentCaptcha: { enabled: true, mode: "threshold" },
			pageViews: pageViewsEnabled
				? { enabled: true }
				: { enabled: false, reason: "feature_disabled" },
			pageLikes: pageLikesEnabled
				? { enabled: true }
				: { enabled: false, reason: "feature_disabled" },
			visitors: { enabled: true },
		},
		viewer: input?.viewer ?? {},
		data: {
			comments: {
				form: {
					allow: ["nickname", "email", "website"],
					require: ["nickname", "email"],
				},
				display: {
					avatar: {
						external: {
							enabled: true,
						},
					},
				},
				pagination: {
					sortBy: "newest",
					limit: 5,
					offset: 0,
					totalCount: comments.length,
					rootCount: comments.length,
				},
				items: comments,
				captcha: {
					required: false,
					verified: false,
					mode: null,
					challenge: null,
				},
			},
			...(pageViewsEnabled ? { pageViews: { count: 12 } } : {}),
			...(pageLikesEnabled
				? {
						pageLikes: {
							count: input?.likeCount ?? 0,
							liked: input?.liked ?? false,
						},
					}
				: {}),
		},
	};
}

function buildThreadResponse(comments: RawComment[] = []) {
	return {
		display: {
			avatar: {
				external: {
					enabled: true,
				},
			},
		},
		pagination: {
			sortBy: "newest",
			limit: 5,
			offset: 0,
			totalCount: comments.length,
			rootCount: comments.length,
		},
		items: comments,
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
		vote: {
			up: 3,
			down: 0,
		},
		createdAt: "2026-04-18T09:00:00.000Z",
		updatedAt: null,
		children: [],
	};
}

async function installFetchMock(
	page: Page,
	input: {
		bootstrap: ReturnType<typeof buildBootstrapResponse>;
		thread?: ReturnType<typeof buildThreadResponse>;
		captchaState?: ReturnType<typeof buildCaptchaState>;
		refreshedCaptchaState?: ReturnType<typeof buildCaptchaState>;
		commentCreate?:
			| {
					firstErrorCode?: string;
					firstErrorMessage?: string;
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
	},
) {
	await page.addInitScript((config) => {
		const originalFetch = window.fetch.bind(window);
		const jsonResponse = (body: unknown, status = 200) =>
			new Response(JSON.stringify(body), {
				status,
				headers: {
					"Content-Type": "application/json",
				},
			});
		const queryObject = (url: URL) =>
			Object.fromEntries(Array.from(url.searchParams.entries()));
		const threadResponse = (comments: unknown[]) => ({
			display: {
				avatar: {
					external: {
						enabled: true,
					},
				},
			},
			pagination: {
				sortBy: "newest",
				limit: 5,
				offset: 0,
				totalCount: comments.length,
				rootCount: comments.length,
			},
			items: comments,
		});

		(
			window as typeof window & {
				__commentTestState: Record<string, unknown>;
			}
		).__commentTestState = {
			commentSubmitCount: 0,
			commentRetryBody: null,
			likeCount: 0,
			likeRetryBody: null,
			voteCount: 0,
			voteRetryBody: null,
			captchaStateCount: 0,
			refreshCount: 0,
			bootstrapQuery: null,
			threadQuery: null,
			captchaStateQuery: null,
			captchaRefreshBody: null,
			commentCreateBodies: [],
			likeBodies: [],
			voteBodies: [],
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
				init?.method ?? (inputArg instanceof Request ? inputArg.method : "GET")
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
				testState.bootstrapQuery = queryObject(url);
				return jsonResponse(config.bootstrap);
			}

			if (url.pathname === "/api/comments/thread/" && method === "GET") {
				testState.threadQuery = queryObject(url);
				return jsonResponse(
					config.thread ??
						threadResponse(config.bootstrap.data.comments?.items ?? []),
				);
			}

			if (url.pathname === "/api/comments/captcha/state/" && method === "GET") {
				testState.captchaStateCount =
					Number(testState.captchaStateCount ?? 0) + 1;
				testState.captchaStateQuery = queryObject(url);
				return jsonResponse(config.captchaState);
			}

			if (
				url.pathname === "/api/comments/captcha/refresh/" &&
				method === "POST"
			) {
				testState.refreshCount = Number(testState.refreshCount ?? 0) + 1;
				testState.captchaRefreshBody = requestBody;
				return jsonResponse(
					config.refreshedCaptchaState ?? config.captchaState,
				);
			}

			if (url.pathname === "/api/comments/" && method === "POST") {
				testState.commentSubmitCount =
					Number(testState.commentSubmitCount ?? 0) + 1;
				(testState.commentCreateBodies as unknown[]).push(requestBody);
				if (
					Number(testState.commentSubmitCount) === 1 &&
					config.commentCreate?.firstErrorCode
				) {
					return jsonResponse(
						{
							error: {
								code: config.commentCreate.firstErrorCode,
								message: config.commentCreate.firstErrorMessage ?? "",
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
				(testState.likeBodies as unknown[]).push(requestBody);
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
				(testState.voteBodies as unknown[]).push(requestBody);
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

function expectSerializedPageIdentity(payload: unknown) {
	expect(payload).toBeTruthy();
	expect(payload).toHaveProperty("pageKey", "extra");
	expect(payload).toHaveProperty("pageUrl", "http://localhost:4321/extra/");
}

type RawCommentOverrides = Partial<
	Omit<RawComment, "author" | "content" | "children">
> & {
	author?: Partial<RawComment["author"]>;
	content?: Partial<RawComment["content"]>;
	children?: RawComment[];
};

function buildSuccessfulCommentResponse(
	commentId: string,
	overrides: RawCommentOverrides = {},
) {
	const baseComment: RawComment = {
		...createCommentFixture(),
		id: commentId,
		parentId: null,
		author: {
			name: "后端返回作者",
			website: null,
		},
		content: {
			raw: "后端返回内容",
			html: "<p>后端返回内容</p>",
		},
		status: "approved",
		isPinned: false,
		isFolded: false,
		replyCount: 0,
		vote: {
			up: 0,
			down: 0,
		},
		createdAt: CREATED_COMMENT_TIMESTAMP,
		updatedAt: CREATED_COMMENT_TIMESTAMP,
		children: [],
	};

	return {
		comment: {
			...baseComment,
			...overrides,
			author: {
				...baseComment.author,
				...overrides.author,
			},
			content: {
				...baseComment.content,
				...overrides.content,
			},
			children: overrides.children ?? baseComment.children,
		},
		thread: {
			commentCount: 1,
			rootCommentCount: 1,
		},
	};
}

test("QingYan API requests serialize documented page identity", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	const seededComment = createCommentFixture();
	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse({
			comments: [seededComment],
		}),
		thread: buildThreadResponse([seededComment]),
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	await page.getByRole("button", { name: "最早在前" }).click();

	await expect
		.poll(async () => (await readTestState(page)).threadQuery)
		.toBeTruthy();

	const testState = await readTestState(page);
	expect(testState.bootstrapQuery).toMatchObject({
		siteKey: "default",
		pageKey: "extra",
		pageTitle: "内容与主题分离，以及评论接入",
		pageUrl: "http://localhost:4321/extra/",
		sortBy: "newest",
		limit: "5",
		offset: "0",
	});

	expect(testState.threadQuery).toMatchObject({
		siteKey: "default",
		pageKey: "extra",
		sortBy: "oldest",
		limit: "5",
		offset: "0",
	});
});

test("QingYan comment captcha and create requests serialize page identity", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	const initialCaptcha = buildCaptchaState(
		"challenge-initial",
		createCaptchaImage("2468"),
	);
	const refreshedCaptcha = buildCaptchaState(
		"challenge-refresh",
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
			successBody: buildSuccessfulCommentResponse("created-shape-comment"),
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const composer = page.locator("section[data-post-title] form");
	await composer.locator('input[type="text"]').fill("请求形状测试");
	await composer.locator('input[type="email"]').fill("shape@example.com");
	await composer.locator("textarea").fill("Referer page context comment shape");
	await composer.getByRole("button", { name: "发表评论" }).click();

	const captchaInput = page.locator(
		'[data-comment-captcha-target="composer"] input[inputmode="numeric"]',
	);
	await page
		.locator('[data-comment-captcha-target="composer"]')
		.getByRole("button", { name: "刷新验证码" })
		.click();
	await expect
		.poll(async () => Number((await readTestState(page)).refreshCount))
		.toBe(1);
	await captchaInput.fill("1357");
	await composer.getByRole("button", { name: "确认" }).click();

	await expect
		.poll(async () => Number((await readTestState(page)).commentSubmitCount))
		.toBe(2);

	const testState = await readTestState(page);
	expect(testState.captchaStateQuery).toMatchObject({
		siteKey: "default",
		pageKey: "extra",
		pageTitle: "内容与主题分离，以及评论接入",
		pageUrl: "http://localhost:4321/extra/",
	});
	expectSerializedPageIdentity(testState.captchaRefreshBody);

	const bodies = testState.commentCreateBodies as unknown[];
	expect(bodies).toHaveLength(2);
	expectSerializedPageIdentity(bodies[0]);
	expectSerializedPageIdentity(bodies[1]);
	expect(bodies[1]).toMatchObject({
		siteKey: "default",
		pageTitle: "内容与主题分离，以及评论接入",
		captcha: {
			challengeId: refreshedCaptcha.challenge.challengeId,
			value: "1357",
		},
	});
});

test("QingYan like and vote requests serialize page identity", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	const seededComment = createCommentFixture();
	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse({
			comments: [seededComment],
			likeCount: 1,
		}),
		thread: buildThreadResponse([seededComment]),
		captchaState: buildCaptchaState("shape-like", createCaptchaImage("2468")),
		pageLike: {
			firstErrorCode: "PAGE_FEEDBACK_CAPTCHA_REQUIRED",
			firstErrorMessage: "请输入验证码。",
			successBody: {
				pageLikes: {
					count: 2,
					liked: true,
				},
			},
		},
		commentVote: {
			firstErrorCode: "VOTE_CAPTCHA_REQUIRED",
			firstErrorMessage: "请输入验证码。",
			successBody: {
				commentId: "comment-1",
				vote: {
					up: 4,
					down: 0,
					viewer: "up",
				},
			},
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const feedbackCard = page
		.locator("section")
		.filter({ hasText: "支持这篇文章" })
		.first();
	const likeButton = feedbackCard.getByRole("button", { name: /点赞/ }).first();
	await likeButton.click();
	await page
		.locator(
			'[data-page-feedback-captcha-target="like"] input[inputmode="numeric"]',
		)
		.fill("2468");
	await page
		.locator(
			'[data-page-feedback-captcha-target="like"] input[inputmode="numeric"]',
		)
		.press("Enter");

	await expect
		.poll(async () => Number((await readTestState(page)).likeCount))
		.toBe(2);

	const voteButton = page.locator('button[aria-label="点赞"]').first();
	await voteButton.click();
	await page
		.locator('[data-comment-vote-confirm-target="comment-1"] button')
		.first()
		.click();
	await page
		.locator('[data-comment-captcha-target="comment-1"] input[inputmode="numeric"]')
		.fill("2468");
	await page
		.locator('[data-comment-captcha-target="comment-1"] input[inputmode="numeric"]')
		.press("Enter");

	await expect
		.poll(async () => Number((await readTestState(page)).voteCount))
		.toBe(2);

	const testState = await readTestState(page);
	for (const body of testState.likeBodies as unknown[]) {
		expectSerializedPageIdentity(body);
	}
	for (const body of testState.voteBodies as unknown[]) {
		expect(body).toMatchObject({
			siteKey: "default",
			pageKey: "extra",
		});
	}
	expect(testState.likeRetryBody).toMatchObject({
		siteKey: "default",
		pageKey: "extra",
		pageTitle: "内容与主题分离，以及评论接入",
		pageUrl: "http://localhost:4321/extra/",
		captcha: {
			challengeId: "shape-like",
			value: "2468",
		},
	});
	expect(testState.voteRetryBody).toMatchObject({
		siteKey: "default",
		pageKey: "extra",
		choice: "up",
		captcha: {
			challengeId: "shape-like",
			value: "2468",
		},
	});
});

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
			successBody: buildSuccessfulCommentResponse("created-comment", {
				content: {
					raw: "验证码弹层 smoke test",
					html: "<p>验证码弹层 smoke test</p>",
				},
			}),
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const composer = page.locator("section[data-post-title] form");
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
	await expect(composer.getByRole("button", { name: "确认" })).toBeVisible();
	await expect(
		composer.getByRole("button", { name: "验证验证码" }),
	).toHaveCount(0);
	await expect(async () => {
		const box = await composerCaptcha.boundingBox();
		expect(box?.width ?? 0).toBeLessThan(340);
	}).toPass();

	await composer.getByRole("button", { name: "确认" }).click();
	await expect
		.poll(async () => Number((await readTestState(page)).commentSubmitCount))
		.toBe(1);
	await expect(composer).toContainText("请输入验证码。");

	const captchaImage = composerCaptcha.locator("img");
	await expect(captchaImage).toHaveAttribute(
		"src",
		initialCaptcha.challenge.imageData,
	);

	await composerCaptcha.getByRole("button", { name: "刷新验证码" }).click();
	await expect
		.poll(async () => Number((await readTestState(page)).refreshCount))
		.toBe(1);
	await expect(captchaImage).toHaveAttribute(
		"src",
		refreshedCaptcha.challenge.imageData,
	);

	await composerCaptcha.locator('input[inputmode="numeric"]').fill("1357");
	await composer.getByRole("button", { name: "确认" }).click();

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

test("admin bootstrap should submit without nickname and email fields", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse({
			viewer: {
				verifiedAuthor: {
					displayName: "站点管理员",
					badgeLabel: "管理员",
				},
			},
		}),
		thread: buildThreadResponse(),
		commentCreate: {
			successBody: buildSuccessfulCommentResponse("created-admin-comment", {
				author: {
					name: "站点管理员",
				},
				content: {
					raw: "管理员直接回复 smoke test",
					html: "<p>管理员直接回复 smoke test</p>",
				},
			}),
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const composer = page.locator("section[data-post-title] form");
	await expect(composer.locator('input[type="text"]')).toHaveCount(0);
	await expect(composer.locator('input[type="email"]')).toHaveCount(0);
	await composer.locator("textarea").fill("管理员直接回复 smoke test");
	await composer.getByRole("button", { name: "发表评论" }).click();

	await expect
		.poll(async () => Number((await readTestState(page)).commentSubmitCount))
		.toBe(1);
	await expect(page.getByText("管理员直接回复 smoke test")).toBeVisible();

	const testState = await readTestState(page);
	expect(testState.commentRetryBody).toMatchObject({
		author: {
			name: "站点管理员",
		},
		content: {
			raw: "管理员直接回复 smoke test",
		},
	});
	expect(
		(testState.commentRetryBody as { author?: { email?: string } }).author
			?.email,
	).toBeUndefined();
});

test("comment composer should remember ordinary author profile by default", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse(),
		thread: buildThreadResponse(),
		commentCreate: {
			successBody: buildSuccessfulCommentResponse("created-profile-comment", {
				author: {
					name: "记忆访客",
					website: "https://example.com",
				},
				content: {
					raw: "记住评论资料 smoke test",
					html: "<p>记住评论资料 smoke test</p>",
				},
			}),
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const composer = page.locator("section[data-post-title] form");
	await expect(composer.getByLabel("记住我")).toBeChecked();
	await composer.locator('input[type="text"]').first().fill("记忆访客");
	await composer.locator('input[type="email"]').fill("memory@example.com");
	await composer.locator('input[type="url"]').fill("https://example.com");
	await composer.locator("textarea").fill("记住评论资料 smoke test");
	await composer.getByRole("button", { name: "发表评论" }).click();

	await expect
		.poll(async () => Number((await readTestState(page)).commentSubmitCount))
		.toBe(1);
	await expect(page.getByText("记住评论资料 smoke test")).toBeVisible();

	const storedProfile = await page.evaluate((key) => {
		const raw = window.localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	}, COMMENTER_PROFILE_STORAGE_KEY);
	expect(storedProfile).toMatchObject({
		authorName: "记忆访客",
		authorEmail: "memory@example.com",
		authorWebsite: "https://example.com",
	});
	expect(Date.parse(storedProfile.expiresAt)).toBeGreaterThan(Date.now());

	await prepareStablePage(page, COMMENT_TEST_ROUTE);
	const reloadedComposer = page.locator("section[data-post-title] form");
	await expect(reloadedComposer.locator('input[type="text"]').first()).toHaveValue(
		"记忆访客",
	);
	await expect(reloadedComposer.locator('input[type="email"]')).toHaveValue(
		"memory@example.com",
	);
	await expect(reloadedComposer.locator('input[type="url"]')).toHaveValue(
		"https://example.com",
	);
	await expect(reloadedComposer.getByLabel("记住我")).toBeChecked();
});

test("comment composer should clear remembered profile when opt out is submitted", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);
	await page.addInitScript((key) => {
		window.localStorage.setItem(
			key,
			JSON.stringify({
				authorName: "旧访客",
				authorEmail: "old@example.com",
				authorWebsite: "https://old.example.com",
				expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
			}),
		);
	}, COMMENTER_PROFILE_STORAGE_KEY);

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse(),
		thread: buildThreadResponse(),
		commentCreate: {
			successBody: buildSuccessfulCommentResponse("created-opt-out-comment", {
				author: {
					name: "不记住访客",
					website: "https://forget.example.com",
				},
				content: {
					raw: "取消记住评论资料 smoke test",
					html: "<p>取消记住评论资料 smoke test</p>",
				},
			}),
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const composer = page.locator("section[data-post-title] form");
	await expect(composer.locator('input[type="text"]').first()).toHaveValue(
		"旧访客",
	);
	await composer.getByLabel("记住我").uncheck();
	await composer.locator('input[type="text"]').first().fill("不记住访客");
	await composer.locator('input[type="email"]').fill("forget@example.com");
	await composer.locator('input[type="url"]').fill("https://forget.example.com");
	await composer.locator("textarea").fill("取消记住评论资料 smoke test");
	await composer.getByRole("button", { name: "发表评论" }).click();

	await expect
		.poll(async () => Number((await readTestState(page)).commentSubmitCount))
		.toBe(1);
	await expect(page.getByText("取消记住评论资料 smoke test")).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate((storageKey) => {
				return window.localStorage.getItem(storageKey);
			}, COMMENTER_PROFILE_STORAGE_KEY),
		)
		.toBeNull();
});

test("page like should retry with captcha on the same button", async ({
	page,
}) => {
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
				pageLikes: {
					count: 2,
					liked: true,
				},
			},
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const feedbackCard = page
		.locator("section")
		.filter({ hasText: "支持这篇文章" })
		.first();
	const likeButton = feedbackCard.getByRole("button", { name: /点赞/ }).first();

	await likeButton.click();
	await expect
		.poll(async () => Number((await readTestState(page)).likeCount))
		.toBe(1);

	const likeCaptchaPopover = page.locator(
		'[data-page-feedback-captcha-target="like"] .comment-captcha-popover',
	);
	await expect(likeCaptchaPopover).toBeVisible();
	await expect(async () => {
		const box = await likeCaptchaPopover.boundingBox();
		expect(box?.width ?? 0).toBeLessThan(340);
	}).toPass();
	const likeCaptchaImage = likeCaptchaPopover.locator("img");
	const likeCaptchaInput = likeCaptchaPopover.locator(
		'input[inputmode="numeric"]',
	);
	await expect(likeCaptchaInput).toBeFocused();
	await expect(async () => {
		const imageBox = await likeCaptchaImage.boundingBox();
		const inputBox = await likeCaptchaInput.boundingBox();
		const promptBox = await page
			.locator(
				'[data-page-feedback-captcha-target="like"] [data-inline-feedback-notice]',
			)
			.first()
			.boundingBox();
		expect((inputBox?.y ?? 0) - (imageBox?.y ?? 0)).toBeGreaterThan(30);
		expect((inputBox?.x ?? 0) - (imageBox?.x ?? 0)).toBeLessThan(8);
		expect(
			(imageBox?.y ?? 0) - ((promptBox?.y ?? 0) + (promptBox?.height ?? 0)),
		).toBeGreaterThan(8);
	}).toPass();
	await expect(
		likeCaptchaPopover.getByRole("button", { name: "验证验证码" }),
	).toHaveCount(0);

	await likeButton.click();
	await expect
		.poll(async () => Number((await readTestState(page)).likeCount))
		.toBe(1);
	await expect(page.getByText("请输入验证码。")).toBeVisible();

	await likeCaptchaInput.fill("2468");
	await likeCaptchaInput.press("Enter");

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
				vote: {
					up: 4,
					down: 0,
					viewer: "up",
				},
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
	await expect(async () => {
		const box = await confirmPopover.boundingBox();
		const buttons = confirmPopover.locator("button");
		const primaryBox = await buttons.nth(0).boundingBox();
		const secondaryBox = await buttons.nth(1).boundingBox();
		expect(box?.width ?? 0).toBeLessThan(300);
		expect(
			Math.abs((primaryBox?.width ?? 0) - (secondaryBox?.width ?? 0)),
		).toBeLessThan(3);
		expect((secondaryBox?.x ?? 0) - (primaryBox?.x ?? 0)).toBeGreaterThan(
			(primaryBox?.width ?? 0) - 4,
		);
		expect(
			(secondaryBox?.x ?? 0) +
				(secondaryBox?.width ?? 0) -
				((box?.x ?? 0) + (box?.width ?? 0)),
		).toBeGreaterThan(-24);
	}).toPass();

	await confirmPopover.locator("button").first().click();
	await expect
		.poll(async () => Number((await readTestState(page)).voteCount))
		.toBe(1);

	const voteCaptchaPopover = page.locator(
		'[data-comment-captcha-target="comment-1"] .comment-captcha-popover',
	);
	await expect(voteCaptchaPopover).toBeVisible();
	await expect(async () => {
		const box = await voteCaptchaPopover.boundingBox();
		expect(box?.width ?? 0).toBeLessThan(340);
	}).toPass();

	await voteButton.click();
	await expect
		.poll(async () => Number((await readTestState(page)).voteCount))
		.toBe(1);
	await expect(page.getByText("请输入验证码。")).toBeVisible();

	const voteCaptchaInput = voteCaptchaPopover.locator(
		'input[inputmode="numeric"]',
	);
	await voteCaptchaInput.fill("2468");
	await voteCaptchaInput.press("Enter");

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

test("comment list should render QingYan avatarUrl and fall back to initials on load failure", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	const avatarUrl = "https://avatar.example.test/fangyuan-test.png";
	const missingAvatarUrl = "https://avatar.example.test/missing.png";
	const commentWithAvatar = {
		...createCommentFixture(),
		id: "comment-with-avatar",
		author: {
			name: "青砚有图",
			website: null,
			avatarUrl,
		},
	};
	const commentWithMissingAvatar = {
		...createCommentFixture(),
		id: "comment-with-missing-avatar",
		author: {
			name: "青砚坏图",
			website: null,
			avatarUrl: missingAvatarUrl,
		},
	};
	const commentWithoutAvatar = {
		...createCommentFixture(),
		id: "comment-without-avatar",
		author: {
			name: "青砚无图",
			website: null,
		},
	};
	await page.route(avatarUrl, (route) =>
		route.fulfill({
			contentType: "image/svg+xml",
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#111827"/></svg>',
		}),
	);
	await page.route(missingAvatarUrl, (route) => route.fulfill({ status: 404 }));

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse({
			comments: [
				commentWithAvatar,
				commentWithMissingAvatar,
				commentWithoutAvatar,
			],
		}),
		thread: buildThreadResponse([
			commentWithAvatar,
			commentWithMissingAvatar,
			commentWithoutAvatar,
		]),
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	await expect(page.getByRole("img", { name: "青砚有图" })).toHaveAttribute(
		"src",
		avatarUrl,
	);
	await expect(page.getByRole("img", { name: "青砚坏图" })).toHaveCount(0);
	await expect(
		page.locator(".comment-item").filter({ hasText: "青砚坏图" }),
	).toContainText("青");
	await expect(page.getByRole("img", { name: "青砚无图" })).toHaveCount(0);
	await expect(
		page.locator(".comment-item").filter({ hasText: "青砚无图" }),
	).toContainText("青");
});

test("comment reply composer should show target author with avatar above the fields", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	const avatarUrl = "https://avatar.example.test/reply-target.png";
	const commentWithAvatar = {
		...createCommentFixture(),
		id: "reply-target-with-avatar",
		author: {
			name: "青砚有图",
			website: null,
			avatarUrl,
		},
	};
	const commentWithoutAvatar = {
		...createCommentFixture(),
		id: "reply-target-without-avatar",
		author: {
			name: "青砚无图",
			website: null,
		},
	};
	await page.route(avatarUrl, (route) =>
		route.fulfill({
			contentType: "image/svg+xml",
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#111827"/></svg>',
		}),
	);

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse({
			comments: [commentWithAvatar, commentWithoutAvatar],
		}),
		thread: buildThreadResponse([commentWithAvatar, commentWithoutAvatar]),
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const composer = page.locator("section[data-post-title] form");
	await page
		.locator(".comment-item")
		.filter({ hasText: "青砚有图" })
		.getByRole("button", { name: "回复" })
		.click();

	const replyBanner = composer.locator('[data-comment-replying="true"]');
	await expect(replyBanner).toContainText("正在回复 青砚有图 的评论");
	await expect(
		replyBanner.getByRole("img", { name: "青砚有图" }),
	).toHaveAttribute("src", avatarUrl);
	await expect(composer.locator("textarea")).toBeFocused();

	await page
		.locator(".comment-item")
		.filter({ hasText: "青砚无图" })
		.getByRole("button", { name: "回复" })
		.click();

	await expect(replyBanner).toContainText("正在回复 青砚无图 的评论");
	await expect(replyBanner.getByRole("img")).toHaveCount(0);
	await expect(replyBanner).toContainText("青");
});

test("comment list should render QingYan trusted author badge", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	const verifiedComment = {
		...createCommentFixture(),
		id: "comment-with-badge",
		author: {
			name: "站点作者",
			website: null,
			badge: { label: "楼主" },
		},
	};
	const ordinaryComment = {
		...createCommentFixture(),
		id: "comment-without-badge",
		author: {
			name: "普通访客",
			website: null,
		},
	};

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse({
			comments: [verifiedComment, ordinaryComment],
		}),
		thread: buildThreadResponse([verifiedComment, ordinaryComment]),
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	await expect(
		page.locator(".comment-item").filter({ hasText: "站点作者" }),
	).toContainText("楼主");
	await expect(
		page.locator(".comment-item").filter({ hasText: "普通访客" }),
	).not.toContainText("楼主");
});

test("disabled QingYan engagement features should hide page views, page like and comment vote controls", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	const seededComment = createCommentFixture();
	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse({
			comments: [seededComment],
			pageMetricsEnabled: false,
			supportsLike: false,
			supportsVote: false,
		}),
		thread: buildThreadResponse([seededComment]),
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	await expect(page.getByText("浏览量")).toHaveCount(0);
	await expect(page.getByRole("button", { name: /点赞/ })).toHaveCount(0);
	await expect(page.locator('button[aria-label="点赞"]')).toHaveCount(0);
	await expect(page.locator('button[aria-label="点踩"]')).toHaveCount(0);
	await expect(
		page.locator(".comment-item").filter({ hasText: "这是一条联调用评论。" }),
	).toBeVisible();
});

test("comment create should insert QingYan public comment response", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse(),
		thread: buildThreadResponse(),
		commentCreate: {
			successBody: buildSuccessfulCommentResponse("created-public-comment", {
				author: {
					name: "后端规范作者",
					website: "https://visitor.example.com/",
				},
				content: {
					raw: "frontend raw should not win",
					html: "<p>后端规范内容</p>",
				},
			}),
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const composer = page.locator("section[data-post-title] form");
	await composer.locator('input[type="text"]').fill("前端输入作者");
	await composer.locator('input[type="email"]').fill("visitor@example.com");
	await composer.locator("textarea").fill("前端输入内容");
	await composer.getByRole("button", { name: "发表评论" }).click();

	const created = page.locator(".comment-item").filter({
		hasText: "后端规范作者",
	});
	await expect(created).toContainText("后端规范内容");
	await expect(created).not.toContainText("前端输入作者");
});

test("verified author create should render returned badge immediately", async ({
	page,
}) => {
	await page.setViewportSize(VIEWPORTS.desktop);

	await installFetchMock(page, {
		bootstrap: buildBootstrapResponse({
			viewer: {
				verifiedAuthor: {
					displayName: "站点管理员",
					badgeLabel: "管理员",
				},
			},
		}),
		thread: buildThreadResponse(),
		commentCreate: {
			successBody: buildSuccessfulCommentResponse("created-verified-comment", {
				author: {
					name: "Virace",
					website: "https://fangyuan.example.com/about",
					badge: { label: "楼主" },
				},
				content: {
					raw: "verified response",
					html: "<p>可信作者后端响应</p>",
				},
			}),
		},
	});

	await prepareStablePage(page, COMMENT_TEST_ROUTE);

	const composer = page.locator("section[data-post-title] form");
	await expect(composer.locator('input[type="text"]')).toHaveCount(0);
	await expect(composer.locator('input[type="email"]')).toHaveCount(0);
	await composer.locator("textarea").fill("前端可信作者输入");
	await composer.getByRole("button", { name: "发表评论" }).click();

	const created = page.locator(".comment-item").filter({ hasText: "Virace" });
	await expect(created).toContainText("楼主");
	await expect(created).toContainText("可信作者后端响应");
});
