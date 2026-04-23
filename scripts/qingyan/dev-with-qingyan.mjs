import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fangYuanRoot = path.resolve(currentDir, "..", "..");
const qingYanRoot = path.resolve(fangYuanRoot, "..", "QingYan");

const pnpmBin = "pnpm";
const qingYanConfigPath = existsSync(path.join(qingYanRoot, "config", "qingyan.yml"))
	? "config/qingyan.yml"
	: "config/qingyan.example.yml";

if (!existsSync(qingYanRoot)) {
	console.error(`[dev:full] 未找到 QingYan 仓库: ${qingYanRoot}`);
	process.exit(1);
}

const children = [];

function runBlocking(name, cwd, args, extraEnv = {}) {
	const result = spawnSync(pnpmBin, args, {
		cwd,
		shell: process.platform === "win32",
		stdio: "inherit",
		env: {
			...process.env,
			...extraEnv,
		},
	});

	if (result.status !== 0) {
		console.error(`[${name}] failed before dev startup`);
		process.exit(result.status ?? 1);
	}
}

function killChildren(signal = "SIGTERM") {
	for (const child of children) {
		if (!child.killed) {
			child.kill(signal);
		}
	}
}

function spawnTagged(name, cwd, args, extraEnv = {}) {
	const child = spawn(pnpmBin, args, {
		cwd,
		shell: process.platform === "win32",
		stdio: "pipe",
		env: {
			...process.env,
			...extraEnv,
		},
	});
	children.push(child);

	child.stdout.on("data", (chunk) => {
		process.stdout.write(`[${name}] ${chunk}`);
	});

	child.stderr.on("data", (chunk) => {
		process.stderr.write(`[${name}] ${chunk}`);
	});

	child.on("exit", (code, signal) => {
		const details = signal ? `signal=${signal}` : `code=${code ?? 0}`;
		console.log(`[${name}] exited (${details})`);
		if (!process.exitCode && code && code !== 0) {
			process.exitCode = code;
			killChildren("SIGTERM");
		}
	});

	return child;
}

process.on("SIGINT", () => {
	killChildren("SIGINT");
	process.exit(130);
});

process.on("SIGTERM", () => {
	killChildren("SIGTERM");
	process.exit(143);
});

console.log(`[dev:full] QingYan config: ${qingYanConfigPath}`);
runBlocking("qingyan:migrate", qingYanRoot, ["db:migrate"], {
	QINGYAN_CONFIG_PATH: qingYanConfigPath,
});
spawnTagged("qingyan", qingYanRoot, ["dev"], {
	QINGYAN_CONFIG_PATH: qingYanConfigPath,
});
spawnTagged("fangyuan", fangYuanRoot, ["dev"]);
