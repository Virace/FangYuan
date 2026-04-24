import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";

function quoteCmdArg(value) {
	const text = String(value);
	if (/^[A-Za-z0-9_./:=-]+$/.test(text)) {
		return text;
	}
	return `"${text.replaceAll('"', '""')}"`;
}

function createProcessCommand(command, args) {
	if (!isWindows) {
		return { command, args };
	}

	return {
		command: "cmd.exe",
		args: ["/d", "/s", "/c", [command, ...args].map(quoteCmdArg).join(" ")],
	};
}

export function runCommand(repoRoot, name, command, args, extraEnv = {}) {
	console.log(`[cloudflare-demo] ${name}: ${command} ${args.join(" ")}`);
	const processCommand = createProcessCommand(command, args);
	const result = spawnSync(processCommand.command, processCommand.args, {
		cwd: repoRoot,
		shell: false,
		stdio: "inherit",
		env: {
			...process.env,
			...extraEnv,
		},
	});
	if (result.status !== 0) {
		throw new Error(`${name} failed with exit code ${result.status ?? 1}`);
	}
}

export function spawnCommand(repoRoot, command, args, extraEnv = {}) {
	const processCommand = createProcessCommand(command, args);
	return spawn(processCommand.command, processCommand.args, {
		cwd: repoRoot,
		shell: false,
		stdio: "inherit",
		env: {
			...process.env,
			...extraEnv,
		},
	});
}

export function stopChildTree(child) {
	if (child.exitCode !== null || !child.pid) {
		return;
	}
	if (isWindows) {
		spawnSync("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
			stdio: "ignore",
		});
		return;
	}
	child.kill("SIGTERM");
}

export async function waitForChildExit(child) {
	return new Promise((resolve, reject) => {
		child.once("exit", (code, signal) => {
			if (code === 0 || signal) {
				resolve();
				return;
			}
			reject(new Error(`wrangler dev exited with code ${code ?? 1}`));
		});
	});
}
