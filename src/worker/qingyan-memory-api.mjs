import {
	bootstrapQuerySchema,
	captchaRefreshBodySchema,
	captchaStateQuerySchema,
	captchaVerifyBodySchema,
	createCommentBodySchema,
	threadQuerySchema,
	voteCommentBodySchema,
	voteCommentParamsSchema,
} from "../../../QingYan/src/modules/comments/schemas.ts";
import {
	devResetBodySchema,
	devScenarioBodySchema,
	devSessionBodySchema,
	devStateQuerySchema,
} from "../../../QingYan/src/modules/dev/schemas.ts";
import { pageLikeBodySchema } from "../../../QingYan/src/modules/page-feedback/schemas.ts";
import {
	ADMIN_COOKIE,
	createAdminSession,
	createCookie,
	jsonResponse,
	parseQuery,
	parseWith,
	readCookie,
	readJson,
	requireAdminSession,
	setVisitorCookie,
	VISITOR_COOKIE,
} from "./qingyan-memory-support.mjs";

function buildSiteSummary() {
	return {
		items: [
			{
				siteKey: "default",
				name: "FangYuan Demo",
				allowedOrigins: [],
				pageCount: 0,
				commentCount: 0,
				userCount: 0,
				visitorCount: 0,
			},
		],
	};
}

async function handleDevApi(request, env, state, path) {
	if (path === "/api/dev/session" && request.method === "POST") {
		const body = await readJson(request);
		const parsed = parseWith(devSessionBodySchema, body);
		const session = createAdminSession(state, env, parsed.token);
		return jsonResponse(
			{ authenticated: true, session: { expiresAt: session.expiresAt } },
			{ cookie: createCookie(ADMIN_COOKIE, session.sessionToken) },
		);
	}

	if (path === "/api/dev/state" && request.method === "GET") {
		requireAdminSession(request, state);
		const parsed = parseWith(
			devStateQuerySchema,
			parseQuery(new URL(request.url)),
		);
		return jsonResponse(
			await state.qingyan.inspect(
				parsed.siteKey,
				parsed.pageKey,
				parsed.visitorKey,
			),
		);
	}

	if (path === "/api/dev/reset" && request.method === "POST") {
		requireAdminSession(request, state);
		const body = await readJson(request);
		const parsed = parseWith(devResetBodySchema, body);
		return jsonResponse(
			await state.qingyan.resetPageState(parsed.siteKey, parsed.pageKey),
		);
	}

	if (path === "/api/dev/scenario" && request.method === "POST") {
		requireAdminSession(request, state);
		const body = await readJson(request);
		const parsed = parseWith(devScenarioBodySchema, body);
		return jsonResponse(await state.qingyan.applyScenario(parsed));
	}

	return null;
}

async function handleAdminApi(request, state, path) {
	if (path === "/api/admin/session/me" && request.method === "GET") {
		const session = requireAdminSession(request, state);
		return jsonResponse({
			authenticated: true,
			session: { expiresAt: session.expiresAt },
			sites: [{ siteKey: "default", name: "FangYuan Demo" }],
		});
	}

	if (path === "/api/admin/sites" && request.method === "GET") {
		requireAdminSession(request, state);
		return jsonResponse(buildSiteSummary());
	}

	return null;
}

async function handleCommentsApi(request, state, path, url, visitorKey, body) {
	if (path === "/api/comments/bootstrap" && request.method === "GET") {
		const parsed = parseWith(bootstrapQuerySchema, parseQuery(url));
		return setVisitorCookie(
			await state.qingyan.getBootstrap({ ...parsed, visitorKey }),
		);
	}

	if (path === "/api/comments/thread" && request.method === "GET") {
		const parsed = parseWith(threadQuerySchema, parseQuery(url));
		return setVisitorCookie(
			await state.qingyan.getThread({ ...parsed, visitorKey }),
		);
	}

	if (path === "/api/comments" && request.method === "POST") {
		const parsed = parseWith(createCommentBodySchema, body);
		return setVisitorCookie(
			await state.qingyan.createComment({
				...parsed,
				contentRaw: parsed.content.raw,
				visitorKey,
			}),
		);
	}

	const voteMatch = path.match(/^\/api\/comments\/([^/]+)\/vote$/);
	if (voteMatch && request.method === "POST") {
		const params = parseWith(voteCommentParamsSchema, {
			commentId: decodeURIComponent(voteMatch[1]),
		});
		const parsed = parseWith(voteCommentBodySchema, body);
		return setVisitorCookie(
			await state.qingyan.castVote({
				...parsed,
				commentId: params.commentId,
				visitorKey,
			}),
		);
	}

	return null;
}

async function handleCaptchaApi(request, state, path, url, visitorKey, body) {
	if (path === "/api/comments/captcha/state" && request.method === "GET") {
		const parsed = parseWith(captchaStateQuerySchema, parseQuery(url));
		return setVisitorCookie(
			await state.qingyan.getCaptchaState({ ...parsed, visitorKey }),
		);
	}

	if (path === "/api/comments/captcha/refresh" && request.method === "POST") {
		const parsed = parseWith(captchaRefreshBodySchema, body);
		return setVisitorCookie(
			await state.qingyan.refreshCaptcha({ ...parsed, visitorKey }),
		);
	}

	if (path === "/api/comments/captcha/verify" && request.method === "POST") {
		const parsed = parseWith(captchaVerifyBodySchema, body);
		const result = await state.qingyan.verifyCaptcha({ ...parsed, visitorKey });
		return jsonResponse(result.body);
	}

	return null;
}

async function handlePageFeedbackApi(request, state, path, visitorKey, body) {
	if (path === "/api/page-feedback/like" && request.method === "POST") {
		const parsed = parseWith(pageLikeBodySchema, body);
		return setVisitorCookie(
			await state.qingyan.likePage({ ...parsed, visitorKey }),
		);
	}

	return null;
}

async function handlePublicApi(request, state, path) {
	const url = new URL(request.url);
	const visitorKey = readCookie(request, VISITOR_COOKIE);
	const body = await readJson(request);
	return (
		(await handleCommentsApi(request, state, path, url, visitorKey, body)) ??
		(await handleCaptchaApi(request, state, path, url, visitorKey, body)) ??
		(await handlePageFeedbackApi(request, state, path, visitorKey, body))
	);
}

export async function handleQingYanApiRequest(request, env, state, path) {
	return (
		(await handleDevApi(request, env, state, path)) ??
		(await handleAdminApi(request, state, path)) ??
		(await handlePublicApi(request, state, path)) ??
		jsonResponse({ error: "MOCK_ENDPOINT_NOT_FOUND", path }, { status: 404 })
	);
}
