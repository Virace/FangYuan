import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	parseQingYanDevControlArgs,
	resolveQingYanDevControlTarget,
	runQingYanDevControl,
} from "../scripts/qingyan-dev-control.mjs";

test("parseQingYanDevControlArgs parses scenario flags into a normalized option bag", () => {
	assert.deepEqual(
		parseQingYanDevControlArgs([
			"scenario",
			"--name",
			"comments-captcha-always",
			"--page-key",
			"post:always-demo",
			"--site-key",
			"default",
			"--page-title",
			"Always Demo",
			"--page-url",
			"/posts/always-demo/",
		]),
		{
			command: "scenario",
			name: "comments-captcha-always",
			siteKey: "default",
			pageKey: "post:always-demo",
			pageTitle: "Always Demo",
			pageUrl: "/posts/always-demo/",
			target: "",
			token: "",
			visitorKey: "",
		},
	);
});

test("parseQingYanDevControlArgs ignores pnpm passthrough double-dash tokens", () => {
	assert.deepEqual(
		parseQingYanDevControlArgs([
			"state",
			"--",
			"--page-key",
			"post:always-demo",
			"--visitor-key",
			"visitor-123",
		]),
		{
			command: "state",
			name: "",
			siteKey: "default",
			pageKey: "post:always-demo",
			pageTitle: "",
			pageUrl: "",
			target: "",
			token: "",
			visitorKey: "visitor-123",
		},
	);
});

test("resolveQingYanDevControlTarget prefers cli flag, then env, then literal site/config.ts value", async (t) => {
	const tempRoot = await mkdtemp(
		path.join(os.tmpdir(), "fangyuan-qingyan-target-"),
	);
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await mkdir(path.join(tempRoot, "site"), { recursive: true });
	await writeFile(
		path.join(tempRoot, "site", "config.ts"),
		'export const qingyanDevProxyTarget = "http://localhost:4401";\n',
		"utf8",
	);

	assert.equal(
		resolveQingYanDevControlTarget({
			cliTarget: "http://127.0.0.1:5501",
			env: {},
			cwd: tempRoot,
		}),
		"http://127.0.0.1:5501",
	);
	assert.equal(
		resolveQingYanDevControlTarget({
			cliTarget: "",
			env: { QINGYAN_DEV_CONTROL_TARGET: "http://127.0.0.1:6601" },
			cwd: tempRoot,
		}),
		"http://127.0.0.1:6601",
	);
	assert.equal(
		resolveQingYanDevControlTarget({
			cliTarget: "",
			env: {},
			cwd: tempRoot,
		}),
		"http://localhost:4401",
	);
});

test("resolveQingYanDevControlTarget rejects the frozen mock target", () => {
	assert.throws(
		() =>
			resolveQingYanDevControlTarget({
				cliTarget: "mock",
				env: {},
				cwd: process.cwd(),
			}),
		/mock/,
	);
});

function createFakeFetch() {
	const calls = [];

	async function fetchImpl(input, init = {}) {
		const url = typeof input === "string" ? input : input.toString();
		calls.push({
			url,
			method: init.method ?? "GET",
			headers: init.headers ?? {},
			body: init.body ?? "",
		});

		if (url.endsWith("/api/dev/session")) {
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: {
					"content-type": "application/json",
					"set-cookie":
						"qingyan_admin=dev-session-cookie; Path=/; HttpOnly; SameSite=Lax",
				},
			});
		}

		if (url.endsWith("/api/dev/scenario")) {
			return new Response(
				JSON.stringify({
					ok: true,
					scenario: "comments-captcha-always",
				}),
				{
					status: 200,
					headers: { "content-type": "application/json" },
				},
			);
		}

		if (url.endsWith("/api/dev/reset")) {
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}

		if (url.includes("/api/dev/state")) {
			return new Response(
				JSON.stringify({
					siteKey: "default",
					pageKey: "post:always-demo",
					visitorKey: "visitor-123",
					captcha: {
						required: true,
						verified: false,
					},
				}),
				{
					status: 200,
					headers: { "content-type": "application/json" },
				},
			);
		}

		throw new Error(`Unhandled url: ${url}`);
	}

	return { calls, fetchImpl };
}

test("runQingYanDevControl opens a dev session, applies a scenario, and prints the refreshed state summary", async () => {
	const output = [];
	const { calls, fetchImpl } = createFakeFetch();

	const result = await runQingYanDevControl({
		argv: [
			"scenario",
			"--name",
			"comments-captcha-always",
			"--page-key",
			"post:always-demo",
			"--page-title",
			"Always Demo",
			"--page-url",
			"/posts/always-demo/",
			"--target",
			"http://127.0.0.1:4401",
			"--token",
			"dev-token",
		],
		env: {},
		cwd: process.cwd(),
		fetchImpl,
		stdout: {
			write(value) {
				output.push(value);
			},
		},
		stderr: { write() {} },
	});

	assert.equal(calls[0].url, "http://127.0.0.1:4401/api/dev/session");
	assert.match(String(calls[0].body), /dev-token/);
	assert.equal(calls[1].url, "http://127.0.0.1:4401/api/dev/scenario");
	assert.match(
		String(calls[1].headers.cookie),
		/qingyan_admin=dev-session-cookie/,
	);
	assert.match(String(calls[1].body), /comments-captcha-always/);
	assert.equal(
		calls[2].url,
		"http://127.0.0.1:4401/api/dev/state?siteKey=default&pageKey=post%3Aalways-demo",
	);
	assert.equal(result.captcha.required, true);
	assert.match(output.join(""), /scenario: comments-captcha-always/);
	assert.match(output.join(""), /captchaRequired: true/);
});

test("runQingYanDevControl appends visitorKey for state requests", async () => {
	const { calls, fetchImpl } = createFakeFetch();

	await runQingYanDevControl({
		argv: [
			"state",
			"--page-key",
			"post:always-demo",
			"--visitor-key",
			"visitor-123",
			"--target",
			"http://127.0.0.1:4401",
			"--token",
			"dev-token",
		],
		env: {},
		cwd: process.cwd(),
		fetchImpl,
		stdout: { write() {} },
		stderr: { write() {} },
	});

	assert.equal(
		calls[1].url,
		"http://127.0.0.1:4401/api/dev/state?siteKey=default&pageKey=post%3Aalways-demo&visitorKey=visitor-123",
	);
	assert.equal(calls[1].method, "GET");
});

test("runQingYanDevControl resets page state and refreshes the summary", async () => {
	const output = [];
	const { calls, fetchImpl } = createFakeFetch();

	await runQingYanDevControl({
		argv: [
			"reset",
			"--page-key",
			"post:always-demo",
			"--target",
			"http://127.0.0.1:4401",
			"--token",
			"dev-token",
		],
		env: {},
		cwd: process.cwd(),
		fetchImpl,
		stdout: {
			write(value) {
				output.push(value);
			},
		},
		stderr: { write() {} },
	});

	assert.equal(calls[1].url, "http://127.0.0.1:4401/api/dev/reset");
	assert.match(output.join(""), /command: reset/);
	assert.match(output.join(""), /next: refresh the FangYuan page/);
});
