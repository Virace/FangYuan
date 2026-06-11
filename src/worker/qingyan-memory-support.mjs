import { DevMockService } from "../../../QingYan/src/modules/dev/mock-service.ts";

export const VISITOR_COOKIE = "qingyan_visitor";
export const ADMIN_COOKIE = "qingyan_admin";

let runtimeState = null;

function createDemoSite(request, env) {
	const origin = new URL(request.url).origin;
	return {
		siteKey: "default",
		name: "FangYuan Demo",
		allowedOrigins: [env.QINGYAN_DEV_ALLOWED_ORIGIN || origin],
		defaults: {
			comments: {
				enabled: true,
				defaultStatus: "pending",
				maxDepth: 3,
				rootLimit: 20,
				identity: {
					require: ["nickname", "email"],
				},
				captcha: {
					mode: "threshold",
					thresholdWindowSec: 60,
					thresholdMaxActions: 3,
				},
				abuseGuard: {
					enabled: true,
					windowSec: 600,
					maxWriteActions: 100,
					autoBlacklist: {
						enabled: true,
						scope: "post",
						ttlSec: 1800,
					},
				},
				allowWebsite: true,
			},
			pageFeedback: {
				allowLike: true,
			},
			notifications: {
				emailEnabled: false,
			},
		},
	};
}

export function getRuntimeState(request, env) {
	if (!runtimeState) {
		runtimeState = {
			adminSessions: new Map(),
			qingyan: new DevMockService(createDemoSite(request, env)),
		};
	}
	return runtimeState;
}

export function normalizePath(pathname) {
	if (pathname === "/") {
		return pathname;
	}
	return pathname.replace(/\/+$/g, "");
}

export function readCookie(request, name) {
	const cookie = request.headers.get("cookie") || "";
	for (const segment of cookie.split(";")) {
		const [rawKey, ...rawValue] = segment.trim().split("=");
		if (rawKey === name) {
			return decodeURIComponent(rawValue.join("="));
		}
	}
	return undefined;
}

export function createCookie(name, value) {
	return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax`;
}

export function jsonResponse(body, init = {}) {
	const headers = new Headers(init.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	if (init.cookie) {
		headers.append("set-cookie", init.cookie);
	}
	return new Response(JSON.stringify(body), {
		status: init.status || 200,
		headers,
	});
}

export function parseQuery(url) {
	return Object.fromEntries(url.searchParams.entries());
}

export async function readJson(request) {
	if (request.method === "GET" || request.method === "HEAD") {
		return {};
	}
	const text = await request.text();
	return text ? JSON.parse(text) : {};
}

export function parseWith(schema, input) {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		throw {
			statusCode: 400,
			code: "INVALID_REQUEST",
			message: "请求参数无效。",
			details: parsed.error.issues,
		};
	}
	return parsed.data;
}

export function setVisitorCookie(result) {
	const cookie = result.visitorKey
		? createCookie(VISITOR_COOKIE, result.visitorKey)
		: undefined;
	return jsonResponse(result.body, { cookie });
}

export function createAdminSession(state, env, token) {
	const expectedToken = env.QINGYAN_DEV_ADMIN_TOKEN || "dev-token";
	if (token !== expectedToken) {
		throw {
			statusCode: 401,
			code: "DEV_AUTH_REQUIRED",
			message: "开发模式认证失败。",
		};
	}
	const sessionToken = `as_${crypto.randomUUID().replaceAll("-", "")}`;
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
	state.adminSessions.set(sessionToken, { expiresAt });
	return { sessionToken, expiresAt };
}

export function requireAdminSession(request, state) {
	const sessionToken = readCookie(request, ADMIN_COOKIE);
	const session = sessionToken
		? state.adminSessions.get(sessionToken)
		: undefined;
	if (!session) {
		throw {
			statusCode: 401,
			code: "ADMIN_AUTH_REQUIRED",
			message: "需要管理员登录。",
		};
	}
	return session;
}

export function errorResponse(error) {
	if (error && typeof error === "object" && "statusCode" in error) {
		return jsonResponse(
			{
				error: {
					code: error.code || "REQUEST_FAILED",
					message: error.message || "请求失败。",
					details: error.details || null,
				},
			},
			{ status: error.statusCode },
		);
	}

	console.error(error);
	return jsonResponse(
		{ error: { code: "INTERNAL_ERROR", message: "服务器内部错误。" } },
		{ status: 500 },
	);
}
