import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";

const DEFAULT_TARGET = "http://127.0.0.1:4401";
const DEFAULT_SITE_KEY = "default";
const DEFAULT_DEV_TOKEN = "dev-token";

function trimString(value) {
	return typeof value === "string" ? value.trim() : "";
}

function readConfiguredDevProxyTarget(cwd) {
	const siteConfigPath = path.join(cwd, "site", "site.config.yaml");
	if (!existsSync(siteConfigPath)) {
		return "";
	}

	const parsed = parse(readFileSync(siteConfigPath, "utf8")) ?? {};
	return trimString(parsed.qingyanDevProxyTarget ?? "");
}

function normalizeHttpTarget(rawTarget) {
	const target = trimString(rawTarget);
	if (!target) {
		return "";
	}
	if (target === "mock") {
		throw new Error(
			"qingyan-dev-control only supports the real QingYan target, not the frozen mock target.",
		);
	}

	let normalized;
	try {
		normalized = new URL(target);
	} catch {
		throw new Error(
			`Invalid QingYan target: ${target}. Use an absolute http(s) URL such as http://127.0.0.1:4401.`,
		);
	}

	if (!["http:", "https:"].includes(normalized.protocol)) {
		throw new Error(
			`Unsupported QingYan target protocol: ${normalized.protocol}. Use http or https.`,
		);
	}

	normalized.pathname = "/";
	normalized.search = "";
	normalized.hash = "";
	return normalized.toString().replace(/\/$/, "");
}

export function parseQingYanDevControlArgs(argv) {
	const normalizedArgv = argv.filter((arg) => arg !== "--");
	if (normalizedArgv.length === 0) {
		throw new Error(
			"Usage: node scripts/qingyan-dev-control.mjs <scenario|reset|state> [flags]",
		);
	}

	const [command, ...rest] = normalizedArgv;
	if (!["scenario", "reset", "state"].includes(command)) {
		throw new Error(`Unsupported command: ${command}`);
	}

	const options = {
		command,
		name: "",
		siteKey: DEFAULT_SITE_KEY,
		pageKey: "",
		pageTitle: "",
		pageUrl: "",
		target: "",
		token: "",
		visitorKey: "",
	};

	for (let index = 0; index < rest.length; index += 2) {
		const flag = rest[index];
		const value = rest[index + 1];
		if (!flag?.startsWith("--") || value === undefined) {
			throw new Error(`Invalid argument pair: ${flag ?? "<missing>"}`);
		}

		switch (flag) {
			case "--name":
				options.name = trimString(value);
				break;
			case "--site-key":
				options.siteKey = trimString(value);
				break;
			case "--page-key":
				options.pageKey = trimString(value);
				break;
			case "--page-title":
				options.pageTitle = trimString(value);
				break;
			case "--page-url":
				options.pageUrl = trimString(value);
				break;
			case "--target":
				options.target = trimString(value);
				break;
			case "--token":
				options.token = trimString(value);
				break;
			case "--visitor-key":
				options.visitorKey = trimString(value);
				break;
			default:
				throw new Error(`Unknown flag: ${flag}`);
		}
	}

	if (!options.pageKey) {
		throw new Error("--page-key is required");
	}
	if (options.command === "scenario" && !options.name) {
		throw new Error("--name is required for scenario");
	}

	return options;
}

export function resolveQingYanDevControlTarget({
	cliTarget = "",
	env = process.env,
	cwd = process.cwd(),
} = {}) {
	const rawTarget =
		trimString(cliTarget) ||
		trimString(env.QINGYAN_DEV_CONTROL_TARGET) ||
		trimString(env.QINGYAN_DEV_PROXY_TARGET) ||
		readConfiguredDevProxyTarget(cwd) ||
		DEFAULT_TARGET;

	return normalizeHttpTarget(rawTarget);
}

function extractCookie(setCookieHeader) {
	return trimString(String(setCookieHeader ?? "")).split(";")[0];
}

async function readJsonResponse(response) {
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		return response.json();
	}

	const text = await response.text();
	try {
		return JSON.parse(text);
	} catch {
		return { raw: text };
	}
}

async function requestJson(fetchImpl, url, init) {
	const response = await fetchImpl(url, init);
	const body = await readJsonResponse(response);
	if (!response.ok) {
		throw new Error(
			`${response.status} ${typeof body === "object" ? JSON.stringify(body) : String(body)}`,
		);
	}
	return { response, body };
}

async function openDevSession({ target, token, fetchImpl }) {
	const { response } = await requestJson(
		fetchImpl,
		new URL("/api/dev/session", target),
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ token }),
		},
	);

	const adminCookie = extractCookie(response.headers.get("set-cookie"));
	if (!adminCookie) {
		throw new Error(
			"QingYan dev session did not return qingyan_admin cookie. Pass --token or set QINGYAN_DEV_ADMIN_TOKEN if your dev server uses a custom token.",
		);
	}

	return adminCookie;
}

function buildJsonHeaders(adminCookie) {
	return {
		"content-type": "application/json",
		cookie: adminCookie,
	};
}

async function fetchDevState({
	target,
	siteKey,
	pageKey,
	visitorKey,
	adminCookie,
	fetchImpl,
}) {
	const stateUrl = new URL("/api/dev/state", target);
	stateUrl.searchParams.set("siteKey", siteKey);
	stateUrl.searchParams.set("pageKey", pageKey);
	if (visitorKey) {
		stateUrl.searchParams.set("visitorKey", visitorKey);
	}

	const { body } = await requestJson(fetchImpl, stateUrl, {
		method: "GET",
		headers: {
			cookie: adminCookie,
		},
	});

	return body;
}

function printSummary(stdout, lines) {
	stdout.write(`${lines.join("\n")}\n`);
}

function buildStateSummary({
	command,
	target,
	siteKey,
	pageKey,
	scenarioName = "",
	state,
	requestedVisitorKey = "",
}) {
	const visitorKey = trimString(state?.visitorKey ?? "") || requestedVisitorKey;
	return [
		...(command === "scenario"
			? ["ok: true", "command: scenario", `scenario: ${scenarioName}`]
			: command === "reset"
				? ["ok: true", "command: reset"]
				: ["command: state"]),
		`siteKey: ${state?.siteKey ?? siteKey}`,
		`pageKey: ${state?.pageKey ?? pageKey}`,
		...(visitorKey ? [`visitorKey: ${visitorKey}`] : []),
		`captchaRequired: ${state?.captcha?.required ?? false}`,
		`captchaVerified: ${state?.captcha?.verified ?? false}`,
		`target: ${target}`,
		command === "state"
			? "next: use this state to decide the next UI validation step."
			: "next: refresh the FangYuan page and validate UI through the normal /api endpoints.",
	];
}

export async function runQingYanDevControl({
	argv = process.argv.slice(2),
	env = process.env,
	cwd = process.cwd(),
	fetchImpl = fetch,
	stdout = process.stdout,
	stderr = process.stderr,
} = {}) {
	try {
		const options = parseQingYanDevControlArgs(argv);
		const target = resolveQingYanDevControlTarget({
			cliTarget: options.target,
			env,
			cwd,
		});
		const siteKey = trimString(options.siteKey) || DEFAULT_SITE_KEY;
		const token =
			trimString(options.token) ||
			trimString(env.QINGYAN_DEV_ADMIN_TOKEN) ||
			DEFAULT_DEV_TOKEN;
		const adminCookie = await openDevSession({
			target,
			token,
			fetchImpl,
		});

		if (options.command === "scenario") {
			await requestJson(fetchImpl, new URL("/api/dev/scenario", target), {
				method: "POST",
					headers: buildJsonHeaders(adminCookie),
					body: JSON.stringify({
						siteKey,
						pageKey: options.pageKey,
						scenario: options.name,
					...(options.pageTitle ? { pageTitle: options.pageTitle } : {}),
					...(options.pageUrl ? { pageUrl: options.pageUrl } : {}),
				}),
			});

			const state = await fetchDevState({
				target,
				siteKey,
				pageKey: options.pageKey,
				visitorKey: options.visitorKey,
				adminCookie,
				fetchImpl,
			});
			printSummary(
				stdout,
				buildStateSummary({
					command: "scenario",
					target,
					siteKey,
					pageKey: options.pageKey,
					scenarioName: options.name,
					state,
					requestedVisitorKey: options.visitorKey,
				}),
			);
			return state;
		}

		if (options.command === "reset") {
			await requestJson(fetchImpl, new URL("/api/dev/reset", target), {
				method: "POST",
					headers: buildJsonHeaders(adminCookie),
					body: JSON.stringify({
						siteKey,
						pageKey: options.pageKey,
					}),
			});

			const state = await fetchDevState({
				target,
				siteKey,
				pageKey: options.pageKey,
				visitorKey: options.visitorKey,
				adminCookie,
				fetchImpl,
			});
			printSummary(
				stdout,
				buildStateSummary({
					command: "reset",
					target,
					siteKey,
					pageKey: options.pageKey,
					state,
					requestedVisitorKey: options.visitorKey,
				}),
			);
			return state;
		}

		const state = await fetchDevState({
			target,
			siteKey,
			pageKey: options.pageKey,
			visitorKey: options.visitorKey,
			adminCookie,
			fetchImpl,
		});
		printSummary(
			stdout,
			buildStateSummary({
				command: "state",
				target,
				siteKey,
				pageKey: options.pageKey,
				state,
				requestedVisitorKey: options.visitorKey,
			}),
		);
		return state;
	} catch (error) {
		stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		throw error;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	runQingYanDevControl().catch(() => {
		process.exitCode = 1;
	});
}
