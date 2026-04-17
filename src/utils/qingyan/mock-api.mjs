import { randomUUID } from "node:crypto";
import { normalizeQingYanDevProxyRequestPath } from "./dev-proxy.mjs";

export const QINGYAN_MOCK_TARGET = "mock";
const DEFAULT_CAPTCHA_ANSWER = "2468";
const DEFAULT_COOKIE_NAME = "qingyan_visitor";

function normalizeCaptchaMode(value, fallback = "threshold") {
	return ["always", "threshold", "never"].includes(value) ? value : fallback;
}

function normalizeSeedMode(value, fallback = "default") {
	return ["default", "empty", "dense"].includes(value) ? value : fallback;
}

function normalizeBooleanFlag(value, fallback) {
	if (value === undefined || value === null || value === "") {
		return fallback;
	}
	return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

function normalizeMockDefaults(input = {}) {
	return {
		captchaMode: normalizeCaptchaMode(input.captchaMode, "threshold"),
		thresholdWindowSec: clampPositiveInteger(input.thresholdWindowSec, 60),
		thresholdMaxActions: clampPositiveInteger(input.thresholdMaxActions, 1),
		banAfterCaptchaFailures: clampPositiveInteger(
			input.banAfterCaptchaFailures,
			2,
		),
		blacklistTtlSec: clampPositiveInteger(input.blacklistTtlSec, 300),
		defaultStatus: input.defaultStatus === "pending" ? "pending" : "approved",
		allowLike: normalizeBooleanFlag(input.allowLike, true),
		seedMode: normalizeSeedMode(input.seedMode, "default"),
		answer: input.answer || DEFAULT_CAPTCHA_ANSWER,
		commentCount: clampPositiveInteger(input.commentCount, 4),
		basePageViewCount: clampPositiveInteger(input.basePageViewCount, 12),
		baseLikeCount: clampNonNegativeInteger(input.baseLikeCount, 0),
	};
}

export function resolveQingYanMockStartupDefaults(env = process.env) {
	return normalizeMockDefaults({
		captchaMode: env.QINGYAN_MOCK_CAPTCHA,
		thresholdWindowSec: env.QINGYAN_MOCK_THRESHOLD_WINDOW,
		thresholdMaxActions: env.QINGYAN_MOCK_THRESHOLD,
		banAfterCaptchaFailures: env.QINGYAN_MOCK_BAN_AFTER,
		blacklistTtlSec: env.QINGYAN_MOCK_BAN_TTL,
		defaultStatus: env.QINGYAN_MOCK_STATUS,
		allowLike: env.QINGYAN_MOCK_ALLOW_LIKE,
		seedMode: env.QINGYAN_MOCK_SEED,
		answer: env.QINGYAN_MOCK_ANSWER,
		commentCount: env.QINGYAN_MOCK_COMMENT_COUNT,
		basePageViewCount: env.QINGYAN_MOCK_PAGE_VIEWS,
		baseLikeCount: env.QINGYAN_MOCK_LIKE_COUNT,
	});
}

function nowIso() {
	return new Date().toISOString();
}

function clampPositiveInteger(value, fallback) {
	const parsed = Number.parseInt(String(value ?? ""), 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampNonNegativeInteger(value, fallback) {
	const parsed = Number.parseInt(String(value ?? ""), 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function buildCommentHtml(raw) {
	return `<p>${escapeHtml(raw).replaceAll("\n", "<br>")}</p>`;
}

function buildCaptchaImageData(answer) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60" role="img" aria-label="captcha"><rect width="160" height="60" rx="10" fill="#f4f7fb"/><text x="80" y="38" text-anchor="middle" font-family="monospace" font-size="28" fill="#111827" letter-spacing="6">${escapeHtml(answer)}</text></svg>`;
	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function parseCookies(headerValue) {
	const cookies = new Map();
	for (const entry of String(headerValue ?? "").split(";")) {
		const [rawName, ...rest] = entry.trim().split("=");
		if (!rawName) {
			continue;
		}
		cookies.set(rawName, rest.join("="));
	}
	return cookies;
}

function parseMockOptions(pageUrl, pageKey, defaults) {
	const url = new URL(pageUrl || `http://localhost/posts/${pageKey}/`);
	const params = url.searchParams;

	return {
		captchaMode: normalizeCaptchaMode(
			params.get("qingyanMockCaptcha"),
			defaults.captchaMode,
		),
		thresholdWindowSec: clampPositiveInteger(
			params.get("qingyanMockThresholdWindow"),
			defaults.thresholdWindowSec,
		),
		thresholdMaxActions: clampPositiveInteger(
			params.get("qingyanMockThreshold"),
			defaults.thresholdMaxActions,
		),
		banAfterCaptchaFailures: clampPositiveInteger(
			params.get("qingyanMockBanAfter"),
			defaults.banAfterCaptchaFailures,
		),
		blacklistTtlSec: clampPositiveInteger(
			params.get("qingyanMockBanTtl"),
			defaults.blacklistTtlSec,
		),
		defaultStatus:
			params.get("qingyanMockStatus") === "pending"
				? "pending"
				: defaults.defaultStatus,
		allowLike: normalizeBooleanFlag(
			params.get("qingyanMockAllowLike"),
			defaults.allowLike,
		),
		seedMode: normalizeSeedMode(
			params.get("qingyanMockSeed"),
			defaults.seedMode,
		),
		answer: params.get("qingyanMockAnswer") || defaults.answer,
		commentCount: clampPositiveInteger(
			params.get("qingyanMockCommentCount"),
			defaults.commentCount,
		),
		basePageViewCount: clampPositiveInteger(
			params.get("qingyanMockPageViews"),
			defaults.basePageViewCount,
		),
		baseLikeCount: clampNonNegativeInteger(
			params.get("qingyanMockLikeCount"),
			defaults.baseLikeCount,
		),
	};
}

function createSeedComments(pageKey, options) {
	const comments = [];
	const rootCount =
		options.seedMode === "dense"
			? Math.max(options.commentCount, 8)
			: Math.max(options.commentCount, 2);

	for (let index = 0; index < rootCount; index += 1) {
		const rootId = `c_${pageKey}_root_${index + 1}`;
		const root = {
			id: rootId,
			parentId: null,
			authorName: index === 0 ? "青砚" : `调试访客 ${index + 1}`,
			authorWebsite: index === 0 ? "https://qingyan.example.test" : null,
			contentRaw:
				index === 0
					? "这是一条用于前端联调的示例评论。给这条评论点赞会稳定触发验证码。"
					: index === 1
						? "这条评论的点赞会稳定触发伪黑名单提示，只用于前端样式测试。"
						: `第 ${index + 1} 条首层评论，用于测试分页、提示与滚动表现。`,
			status: options.defaultStatus,
			createdAt: new Date(Date.UTC(2026, 3, 18, 9, index * 3, 0)).toISOString(),
			updatedAt: null,
			voteUp: index === 0 ? 3 : index % 4,
			voteDown: index % 3 === 0 ? 0 : index % 2,
			mockVoteMode: index === 0 ? "captcha" : index === 1 ? "blacklist" : null,
			viewerVotes: new Map(),
			children: [],
		};
		comments.push(root);

		const shouldCreateReply =
			options.seedMode === "dense" || index === 0 || index % 2 === 0;
		if (!shouldCreateReply) {
			continue;
		}

		const replyId = `c_${pageKey}_reply_${index + 1}`;
		root.children.push(replyId);
		comments.push({
			id: replyId,
			parentId: rootId,
			authorName: "前端调试",
			authorWebsite: null,
			contentRaw:
				index === 0
					? "验证码、投票、提示动画都可以在这里观察。"
					: `这是第 ${index + 1} 条评论的回复，用来测试嵌套样式。`,
			status: options.defaultStatus,
			createdAt: new Date(
				Date.UTC(2026, 3, 18, 9, index * 3 + 1, 0),
			).toISOString(),
			updatedAt: null,
			voteUp: index % 2,
			voteDown: 0,
			mockVoteMode: null,
			viewerVotes: new Map(),
			children: [],
		});
	}

	return comments;
}

function createPageState({ pageKey, pageTitle, pageUrl, options }) {
	const comments = new Map();
	const rootIds = [];
	if (options.seedMode !== "empty") {
		for (const comment of createSeedComments(pageKey, options)) {
			comments.set(comment.id, comment);
			if (!comment.parentId) {
				rootIds.push(comment.id);
			}
		}
	}

	return {
		pageKey,
		pageTitle,
		pageUrl,
		pageViewCount: options.basePageViewCount,
		baseLikeCount: options.baseLikeCount,
		pageLikeVisitorIds: new Set(),
		comments,
		rootIds,
	};
}

function sortRootIds(pageState, sortBy) {
	return [...pageState.rootIds].sort((leftId, rightId) => {
		const left = pageState.comments.get(leftId);
		const right = pageState.comments.get(rightId);
		if (!left || !right) {
			return 0;
		}
		return sortBy === "oldest"
			? left.createdAt.localeCompare(right.createdAt)
			: right.createdAt.localeCompare(left.createdAt);
	});
}

function countDescendants(pageState, commentId) {
	const comment = pageState.comments.get(commentId);
	if (!comment) {
		return 0;
	}
	let count = comment.children.length;
	for (const childId of comment.children) {
		count += countDescendants(pageState, childId);
	}
	return count;
}

function buildCommentPayload(pageState, commentId, visitorId) {
	const comment = pageState.comments.get(commentId);
	if (!comment) {
		return null;
	}

	return {
		id: comment.id,
		parentId: comment.parentId,
		author: {
			name: comment.authorName,
			website: comment.authorWebsite,
		},
		content: {
			raw: comment.contentRaw,
			html: buildCommentHtml(comment.contentRaw),
		},
		status: comment.status,
		isPinned: false,
		isFolded: false,
		replyCount: countDescendants(pageState, comment.id),
		voteUp: comment.voteUp,
		voteDown: comment.voteDown,
		viewerVote: comment.viewerVotes.get(visitorId) ?? null,
		createdAt: comment.createdAt,
		updatedAt: comment.updatedAt,
		children: comment.children
			.map((childId) => buildCommentPayload(pageState, childId, visitorId))
			.filter(Boolean),
	};
}

function createJsonResponse(status, payload, headers = {}) {
	return {
		status,
		headers: {
			"content-type": "application/json",
			...headers,
		},
		body: JSON.stringify(payload),
	};
}

function createErrorResponse(status, code, message, headers = {}) {
	return createJsonResponse(
		status,
		{
			error: {
				code,
				message,
				requestId: randomUUID(),
			},
		},
		headers,
	);
}

function createCookieHeader(visitorId) {
	return `${DEFAULT_COOKIE_NAME}=${visitorId}; Path=/; SameSite=Lax`;
}

function trimTimestamps(timestamps, windowSec, now) {
	const floor = now - windowSec * 1000;
	return timestamps.filter((value) => value >= floor);
}

export function isQingYanMockTarget(target) {
	return target === QINGYAN_MOCK_TARGET;
}

export function createQingYanMockBackend(input = {}) {
	const startupDefaults = normalizeMockDefaults(input.defaults);
	const pageStates = new Map();
	const visitorStates = new Map();

	function ensureVisitor(visitorId) {
		const normalizedVisitorId = visitorId || `mock_${randomUUID()}`;
		if (!visitorStates.has(normalizedVisitorId)) {
			visitorStates.set(normalizedVisitorId, {
				pages: new Map(),
			});
		}
		return {
			visitorId: normalizedVisitorId,
			state: visitorStates.get(normalizedVisitorId),
		};
	}

	function ensurePage(input) {
		const options = parseMockOptions(
			input.pageUrl,
			input.pageKey,
			startupDefaults,
		);
		const cacheKey = `${input.siteKey}|${input.pageKey}`;
		const current = pageStates.get(cacheKey);
		if (current) {
			current.pageTitle = input.pageTitle || current.pageTitle;
			current.pageUrl = input.pageUrl || current.pageUrl;
			return { pageState: current, options };
		}

		const pageState = createPageState({
			pageKey: input.pageKey,
			pageTitle: input.pageTitle || input.pageKey,
			pageUrl: input.pageUrl,
			options,
		});
		pageStates.set(cacheKey, pageState);
		return { pageState, options };
	}

	function ensureVisitorPageState(visitorState, pageKey) {
		if (!visitorState.pages.has(pageKey)) {
			visitorState.pages.set(pageKey, {
				writeTimestamps: [],
				challengeId: null,
				challengeAnswer: DEFAULT_CAPTCHA_ANSWER,
				verified: false,
				captchaFailures: 0,
				blacklistedUntil: 0,
			});
		}
		return visitorState.pages.get(pageKey);
	}

	function buildCaptchaState(visitorPageState, options, forceChallenge) {
		const shouldRequire =
			options.captchaMode === "always" ||
			(forceChallenge && options.captchaMode !== "never") ||
			visitorPageState.challengeId !== null;

		if (!shouldRequire) {
			return {
				required: false,
				verified: false,
				mode: null,
				challenge: null,
			};
		}

		if (!visitorPageState.challengeId) {
			visitorPageState.challengeId = `cap_${randomUUID()}`;
			visitorPageState.challengeAnswer = options.answer;
		}

		return {
			required: true,
			verified: visitorPageState.verified,
			mode: "inline_value",
			challenge: {
				challengeId: visitorPageState.challengeId,
				mode: "inline_value",
				imageData: buildCaptchaImageData(visitorPageState.challengeAnswer),
			},
		};
	}

	function assertNotBlacklisted(visitorPageState, _options, headers) {
		if (visitorPageState.blacklistedUntil > Date.now()) {
			return createErrorResponse(
				403,
				"COMMENT_BLACKLISTED",
				"当前请求已被拒绝。",
				headers,
			);
		}

		if (visitorPageState.blacklistedUntil !== 0) {
			visitorPageState.blacklistedUntil = 0;
			visitorPageState.captchaFailures = 0;
		}

		return null;
	}

	function ensureWriteAllowed({
		visitorPageState,
		options,
		errorCode,
		headers,
	}) {
		const blacklist = assertNotBlacklisted(visitorPageState, options, headers);
		if (blacklist) {
			return blacklist;
		}

		visitorPageState.writeTimestamps = trimTimestamps(
			visitorPageState.writeTimestamps,
			options.thresholdWindowSec,
			Date.now(),
		);

		const needsCaptcha =
			options.captchaMode === "always" ||
			(options.captchaMode === "threshold" &&
				visitorPageState.writeTimestamps.length + 1 >=
					options.thresholdMaxActions);

		if (needsCaptcha && !visitorPageState.verified) {
			return createErrorResponse(400, errorCode, "请输入验证码。", headers);
		}

		return null;
	}

	function buildThreadPayload({
		siteKey,
		pageState,
		visitorId,
		sortBy,
		limit,
		offset,
	}) {
		const sortedRootIds = sortRootIds(pageState, sortBy);
		const slice = sortedRootIds.slice(offset, offset + limit);
		return {
			thread: {
				siteKey,
				pageKey: pageState.pageKey,
				pageTitle: pageState.pageTitle,
			},
			pagination: {
				sortBy,
				limit,
				offset,
				totalCount: pageState.comments.size,
				rootCount: pageState.rootIds.length,
			},
			comments: slice
				.map((commentId) =>
					buildCommentPayload(pageState, commentId, visitorId),
				)
				.filter(Boolean),
		};
	}

	function incrementReplyCount(pageState, parentId) {
		let currentId = parentId;
		while (currentId) {
			const current = pageState.comments.get(currentId);
			if (!current) {
				break;
			}
			current.updatedAt = nowIso();
			currentId = current.parentId;
		}
	}

	async function handleRequest(input) {
		const normalizedUrl = normalizeQingYanDevProxyRequestPath(input.url);
		const url = new URL(normalizedUrl, "http://localhost");
		if (!url.pathname.startsWith("/api/")) {
			return null;
		}

		const cookies = parseCookies(input.headers?.cookie);
		const visitorCookie = cookies.get(DEFAULT_COOKIE_NAME);
		const { visitorId, state: visitorState } = ensureVisitor(visitorCookie);
		const responseHeaders = visitorCookie
			? {}
			: { "set-cookie": createCookieHeader(visitorId) };

		const requestBody =
			typeof input.body === "string" && input.body
				? JSON.parse(input.body)
				: input.body || {};
		const siteKey =
			requestBody.siteKey || url.searchParams.get("siteKey") || "fangyuan";
		const pageKey =
			requestBody.pageKey || url.searchParams.get("pageKey") || "post:welcome";
		const pageTitle =
			requestBody.pageTitle || url.searchParams.get("pageTitle") || pageKey;
		const pageUrl =
			requestBody.pageUrl || url.searchParams.get("pageUrl") || "";
		const { pageState, options } = ensurePage({
			siteKey,
			pageKey,
			pageTitle,
			pageUrl,
		});
		const visitorPageState = ensureVisitorPageState(visitorState, pageKey);

		if (url.pathname === "/api/comments/bootstrap/" && input.method === "GET") {
			pageState.pageViewCount += 1;
			const sortBy =
				url.searchParams.get("sortBy") === "oldest" ? "oldest" : "newest";
			const limit = clampPositiveInteger(url.searchParams.get("limit"), 5);
			const offset =
				clampPositiveInteger(url.searchParams.get("offset"), 0) - 0;
			const threadPayload = buildThreadPayload({
				siteKey,
				pageState,
				visitorId,
				sortBy,
				limit,
				offset,
			});

			return createJsonResponse(
				200,
				{
					capability: {
						enabled: true,
						supportsReply: true,
						supportsVote: true,
						supportsCaptcha: options.captchaMode !== "never",
						defaultStatus: options.defaultStatus,
						message: null,
					},
					commentForm: {
						allow: ["nickname", "email", "website"],
						require: ["nickname", "email"],
					},
					...threadPayload,
					pageMetrics: {
						pageViewCount: pageState.pageViewCount,
					},
					pageFeedback: {
						supportsLike: options.allowLike,
						likeCount:
							pageState.baseLikeCount + pageState.pageLikeVisitorIds.size,
						liked: pageState.pageLikeVisitorIds.has(visitorId),
					},
					captcha: buildCaptchaState(
						visitorPageState,
						options,
						options.captchaMode === "always",
					),
				},
				responseHeaders,
			);
		}

		if (url.pathname === "/api/comments/thread/" && input.method === "GET") {
			const sortBy =
				url.searchParams.get("sortBy") === "oldest" ? "oldest" : "newest";
			const limit = clampPositiveInteger(url.searchParams.get("limit"), 5);
			const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
			return createJsonResponse(
				200,
				buildThreadPayload({
					siteKey,
					pageState,
					visitorId,
					sortBy,
					limit,
					offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
				}),
				responseHeaders,
			);
		}

		if (
			url.pathname === "/api/comments/captcha/state/" &&
			input.method === "GET"
		) {
			const blacklist = assertNotBlacklisted(
				visitorPageState,
				options,
				responseHeaders,
			);
			if (blacklist) {
				return blacklist;
			}

			return createJsonResponse(
				200,
				buildCaptchaState(
					visitorPageState,
					options,
					options.captchaMode === "always" ||
						visitorPageState.challengeId !== null,
				),
				responseHeaders,
			);
		}

		if (
			url.pathname === "/api/comments/captcha/verify/" &&
			input.method === "POST"
		) {
			const blacklist = assertNotBlacklisted(
				visitorPageState,
				options,
				responseHeaders,
			);
			if (blacklist) {
				return blacklist;
			}

			if (
				!visitorPageState.challengeId ||
				requestBody.challengeId !== visitorPageState.challengeId
			) {
				return createErrorResponse(
					400,
					"COMMENT_CAPTCHA_REQUIRED",
					"请重新获取验证码。",
					responseHeaders,
				);
			}

			if (
				String(requestBody.value ?? "").trim() !==
				visitorPageState.challengeAnswer
			) {
				visitorPageState.captchaFailures += 1;
				if (
					visitorPageState.captchaFailures >= options.banAfterCaptchaFailures
				) {
					visitorPageState.blacklistedUntil =
						Date.now() + options.blacklistTtlSec * 1000;
					return createErrorResponse(
						403,
						"COMMENT_BLACKLISTED",
						"当前请求已被拒绝。",
						responseHeaders,
					);
				}

				return createErrorResponse(
					400,
					"COMMENT_CAPTCHA_INVALID",
					"验证码错误，请重试。",
					responseHeaders,
				);
			}

			visitorPageState.verified = true;
			visitorPageState.captchaFailures = 0;
			return createJsonResponse(
				200,
				buildCaptchaState(visitorPageState, options, true),
				responseHeaders,
			);
		}

		if (url.pathname === "/api/comments/" && input.method === "POST") {
			const blocked = ensureWriteAllowed({
				visitorPageState,
				options,
				errorCode: "COMMENT_CAPTCHA_REQUIRED",
				headers: responseHeaders,
			});
			if (blocked) {
				buildCaptchaState(visitorPageState, options, true);
				return blocked;
			}

			const commentId = `c_${randomUUID()}`;
			const parentId = requestBody.parentCommentId || null;
			const createdAt = nowIso();
			pageState.comments.set(commentId, {
				id: commentId,
				parentId,
				authorName: requestBody.author?.name || "Mock Visitor",
				authorWebsite: requestBody.author?.website || null,
				contentRaw: requestBody.content?.raw || "",
				status: options.defaultStatus,
				createdAt,
				updatedAt: null,
				voteUp: 0,
				voteDown: 0,
				mockVoteMode: null,
				viewerVotes: new Map(),
				children: [],
			});

			if (parentId) {
				const parent = pageState.comments.get(parentId);
				if (parent) {
					parent.children.push(commentId);
					incrementReplyCount(pageState, parentId);
				} else {
					pageState.rootIds.unshift(commentId);
				}
			} else {
				pageState.rootIds.unshift(commentId);
			}

			visitorPageState.writeTimestamps.push(Date.now());
			return createJsonResponse(
				200,
				{
					comment: {
						id: commentId,
						status: options.defaultStatus,
						message:
							options.defaultStatus === "approved"
								? "评论已发布。"
								: "评论已提交，等待审核。",
					},
					thread: {
						commentCount: pageState.comments.size,
						rootCommentCount: pageState.rootIds.length,
					},
				},
				responseHeaders,
			);
		}

		const voteMatch = url.pathname.match(/^\/api\/comments\/(.+)\/vote\/$/);
		if (voteMatch && input.method === "POST") {
			const commentId = decodeURIComponent(voteMatch[1]);
			const comment = pageState.comments.get(commentId);
			if (!comment) {
				return createErrorResponse(
					404,
					"COMMENT_NOT_FOUND",
					"评论不存在。",
					responseHeaders,
				);
			}

			const blacklist = assertNotBlacklisted(
				visitorPageState,
				options,
				responseHeaders,
			);
			if (blacklist) {
				return blacklist;
			}

			if (comment.mockVoteMode === "blacklist") {
				return createErrorResponse(
					403,
					"COMMENT_BLACKLISTED",
					"当前请求已被拒绝。",
					responseHeaders,
				);
			}

			if (comment.mockVoteMode === "captcha" && !visitorPageState.verified) {
				buildCaptchaState(visitorPageState, options, true);
				return createErrorResponse(
					400,
					"VOTE_CAPTCHA_REQUIRED",
					"请输入验证码。",
					responseHeaders,
				);
			}

			const blocked = ensureWriteAllowed({
				visitorPageState,
				options,
				errorCode: "VOTE_CAPTCHA_REQUIRED",
				headers: responseHeaders,
			});
			if (blocked) {
				buildCaptchaState(visitorPageState, options, true);
				return blocked;
			}

			const choice = requestBody.choice === "down" ? "down" : "up";
			const previousVote = comment.viewerVotes.get(visitorId);
			if (previousVote) {
				return createErrorResponse(
					409,
					"COMMENT_ALREADY_VOTED",
					"你已经投过票了。",
					responseHeaders,
				);
			}

			comment.viewerVotes.set(visitorId, choice);
			if (choice === "up") {
				comment.voteUp += 1;
			} else {
				comment.voteDown += 1;
			}
			visitorPageState.writeTimestamps.push(Date.now());

			return createJsonResponse(
				200,
				{
					commentId: comment.id,
					voteUp: comment.voteUp,
					voteDown: comment.voteDown,
					viewerVote: choice,
				},
				responseHeaders,
			);
		}

		if (
			url.pathname === "/api/page-feedback/like/" &&
			input.method === "POST"
		) {
			const blocked = ensureWriteAllowed({
				visitorPageState,
				options,
				errorCode: "COMMENT_CAPTCHA_REQUIRED",
				headers: responseHeaders,
			});
			if (blocked) {
				buildCaptchaState(visitorPageState, options, true);
				return blocked;
			}

			if (!options.allowLike) {
				return createErrorResponse(
					403,
					"PAGE_FEEDBACK_DISABLED",
					"页面点赞功能未开启。",
					responseHeaders,
				);
			}

			if (pageState.pageLikeVisitorIds.has(visitorId)) {
				return createErrorResponse(
					409,
					"PAGE_FEEDBACK_ALREADY_LIKED",
					"你已经点过赞了。",
					responseHeaders,
				);
			}

			pageState.pageLikeVisitorIds.add(visitorId);
			visitorPageState.writeTimestamps.push(Date.now());
			return createJsonResponse(
				200,
				{
					pageFeedback: {
						supportsLike: true,
						likeCount:
							pageState.baseLikeCount + pageState.pageLikeVisitorIds.size,
						liked: true,
					},
				},
				responseHeaders,
			);
		}

		return null;
	}

	return {
		handleRequest,
	};
}

async function readRequestBody(req) {
	const chunks = [];
	for await (const chunk of req) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString("utf8");
}

function writeMockResponse(res, response) {
	res.statusCode = response.status;
	for (const [key, value] of Object.entries(response.headers)) {
		res.setHeader(key, value);
	}
	res.end(response.body);
}

export function createQingYanMockPlugin() {
	const backend = createQingYanMockBackend({
		defaults: resolveQingYanMockStartupDefaults(),
	});

	function createMiddleware() {
		return async (req, res, next) => {
			if (!req.url?.startsWith("/api/")) {
				next();
				return;
			}

			const body =
				req.method === "POST" || req.method === "PUT" || req.method === "PATCH"
					? await readRequestBody(req)
					: "";
			const response = await backend.handleRequest({
				method: req.method || "GET",
				url: req.url,
				headers: req.headers,
				body,
			});
			if (!response) {
				next();
				return;
			}

			writeMockResponse(res, response);
		};
	}

	return {
		name: "fangyuan-qingyan-mock-api",
		configureServer(server) {
			server.middlewares.use(createMiddleware());
		},
		configurePreviewServer(server) {
			return () => {
				server.middlewares.use(createMiddleware());
			};
		},
	};
}
