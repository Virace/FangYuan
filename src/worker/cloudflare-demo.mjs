import { handleQingYanApiRequest } from "./qingyan-memory-api.mjs";
import {
	errorResponse,
	getRuntimeState,
	jsonResponse,
	normalizePath,
} from "./qingyan-memory-support.mjs";

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = normalizePath(url.pathname);

		try {
			if (path === "/healthz") {
				return jsonResponse({
					ok: true,
					service: "fangyuan-cloudflare-demo",
					qingyan: "memory",
				});
			}

			if (path.startsWith("/api/")) {
				const state = getRuntimeState(request, env);
				return await handleQingYanApiRequest(request, env, state, path);
			}

			return env.ASSETS.fetch(request);
		} catch (error) {
			return errorResponse(error);
		}
	},
};
