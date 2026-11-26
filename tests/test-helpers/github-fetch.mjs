import { appendFileSync, readFileSync } from "node:fs";
import { githubPayload } from "./github-payload.mjs";

const nativeFetch = globalThis.fetch;
const fixturePath = process.env.FANGYUAN_TEST_GITHUB_FIXTURE;
const fixture = fixturePath ? JSON.parse(readFileSync(fixturePath, "utf8")) : {};

// 仅由测试进程显式预载，不向生产模块加入 mock 环境开关。
globalThis.fetch = async (input, options = {}) => {
	const requestUrl = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
	if (requestUrl.origin !== "https://api.github.com" || !requestUrl.pathname.startsWith("/repos/")) {
		return nativeFetch(input, options);
	}
	const repo = requestUrl.pathname.slice("/repos/".length);
	const authorization = new Headers(options.headers).get("Authorization");
	const authenticated = authorization === `Bearer ${fixture.expectedToken}`;
	if (fixture.callsFile) {
		appendFileSync(fixture.callsFile, `${JSON.stringify({ repo, authenticated })}\n`);
	}
	const status = fixture.expectedToken && !authenticated ? 401 : fixture.status ?? 200;
	return new Response(JSON.stringify(status === 200 ? githubPayload(repo, fixture.overrides) : { message: "Fixture request unavailable" }), {
		status,
		headers: { "Content-Type": "application/json" },
	});
};
