import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSmoke, waitForHealthz } from "./demo-smoke.mjs";
import {
	runCommand,
	spawnCommand,
	stopChildTree,
	waitForChildExit,
} from "./process-runner.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..");
const qingYanRoot = path.resolve(repoRoot, "..", "QingYan");
const wranglerConfig = path.join(repoRoot, "wrangler.demo.jsonc");
const pnpmBin = "pnpm";
const wranglerBin = "wrangler";

function parseArgs(argv) {
	const options = {
		command: "smoke",
		base: "/",
		port: 8787,
		site: "https://fangyuan.oogoo.top",
		skipBuild: false,
	};
	const args = [...argv];
	if (args[0] && !args[0].startsWith("--")) {
		options.command = args.shift();
	}
	for (let index = 0; index < args.length; index += 1) {
		const current = args[index];
		if (current === "--") {
			continue;
		}
		if (current === "--skip-build") {
			options.skipBuild = true;
			continue;
		}
		const value = args[index + 1];
		if (!value) {
			throw new Error(`${current} requires a value.`);
		}
		if (current === "--site") {
			options.site = value;
		} else if (current === "--base") {
			options.base = value;
		} else if (current === "--port") {
			const port = Number(value);
			if (!Number.isInteger(port) || port < 1 || port > 65535) {
				throw new Error(`Invalid port: ${value}`);
			}
			options.port = port;
		} else {
			throw new Error(`Unknown option: ${current}`);
		}
		index += 1;
	}
	return options;
}

function run(name, command, args, extraEnv = {}) {
	runCommand(repoRoot, name, command, args, extraEnv);
}

function buildEnv(options) {
	return {
		FANGYUAN_BASE: options.base,
		FANGYUAN_SITE: options.site,
		PUBLIC_FANGYUAN_BASE: options.base,
		PUBLIC_FANGYUAN_ALLOW_DEMO_QINGYAN: "true",
		PUBLIC_FANGYUAN_DEMO_QINGYAN: "true",
		PUBLIC_FANGYUAN_QINGYAN_API_BASE: "/api",
		PUBLIC_FANGYUAN_QINGYAN_SITE_KEY: "default",
		PUBLIC_FANGYUAN_SITE: options.site,
		WRANGLER_SEND_METRICS: "false",
	};
}

function resolveDeployDomain(options) {
	const siteUrl = new URL(options.site);
	if (siteUrl.protocol !== "https:" || siteUrl.pathname !== "/") {
		throw new Error(
			`Deploy site must be an HTTPS origin without path: ${options.site}`,
		);
	}
	return siteUrl.hostname;
}

function assertLocalPrerequisites() {
	if (!existsSync(qingYanRoot)) {
		throw new Error(`QingYan repository not found: ${qingYanRoot}`);
	}
	if (
		!existsSync(
			path.join(qingYanRoot, "src", "modules", "dev", "mock-service.ts"),
		)
	) {
		throw new Error("QingYan dev mock source is missing.");
	}
	if (!existsSync(wranglerConfig)) {
		throw new Error(`Wrangler config not found: ${wranglerConfig}`);
	}
	run("wrangler version", wranglerBin, ["--version"]);
}

function buildSite(options) {
	if (options.skipBuild) {
		console.log("[cloudflare-demo] skip FangYuan build");
		return;
	}
	run(
		"build FangYuan demo",
		pnpmBin,
		["run", "build:internal"],
		buildEnv(options),
	);
}

function dryRunBundle() {
	run("wrangler dry-run", wranglerBin, [
		"deploy",
		"--config",
		"wrangler.demo.jsonc",
		"--dry-run",
		"--outdir",
		".temp/cloudflare-demo/bundle",
	]);
}

function spawnWranglerDev(options) {
	const args = [
		"dev",
		"--config",
		"wrangler.demo.jsonc",
		"--local",
		"--ip",
		"127.0.0.1",
		"--port",
		String(options.port),
		"--show-interactive-dev-session=false",
	];
	return spawnCommand(repoRoot, wranglerBin, args, {
		WRANGLER_SEND_METRICS: "false",
	});
}

async function smoke(options) {
	dryRunBundle();
	const origin = `http://127.0.0.1:${options.port}`;
	const child = spawnWranglerDev(options);
	try {
		await waitForHealthz(origin, child);
		await runSmoke(origin);
	} finally {
		stopChildTree(child);
	}
}

async function dev(options) {
	const child = spawnWranglerDev(options);
	let stopping = false;
	const stop = () => {
		stopping = true;
		stopChildTree(child);
	};
	process.once("SIGINT", stop);
	process.once("SIGTERM", stop);
	try {
		await waitForChildExit(child);
	} catch (error) {
		if (!stopping) {
			throw error;
		}
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	assertLocalPrerequisites();
	buildSite(options);

	if (options.command === "smoke") {
		await smoke(options);
		return;
	}
	if (options.command === "dev") {
		await dev(options);
		return;
	}
	if (options.command === "deploy") {
		run("wrangler deploy", wranglerBin, [
			"deploy",
			"--config",
			"wrangler.demo.jsonc",
			"--domain",
			resolveDeployDomain(options),
		]);
		return;
	}

	throw new Error(`Unknown command: ${options.command}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
