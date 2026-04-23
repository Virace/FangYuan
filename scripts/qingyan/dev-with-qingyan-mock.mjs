import { spawn } from "node:child_process";

const flagMap = {
	"--captcha": "QINGYAN_MOCK_CAPTCHA",
	"--threshold": "QINGYAN_MOCK_THRESHOLD",
	"--threshold-window": "QINGYAN_MOCK_THRESHOLD_WINDOW",
	"--ban-after": "QINGYAN_MOCK_BAN_AFTER",
	"--ban-ttl": "QINGYAN_MOCK_BAN_TTL",
	"--seed": "QINGYAN_MOCK_SEED",
	"--comment-count": "QINGYAN_MOCK_COMMENT_COUNT",
	"--page-views": "QINGYAN_MOCK_PAGE_VIEWS",
	"--like-count": "QINGYAN_MOCK_LIKE_COUNT",
	"--status": "QINGYAN_MOCK_STATUS",
	"--answer": "QINGYAN_MOCK_ANSWER",
	"--allow-like": "QINGYAN_MOCK_ALLOW_LIKE",
};

const rawArgs = process.argv.slice(2);
const astroArgs = ["exec", "astro", "dev"];
const env = {
	...process.env,
	QINGYAN_DEV_PROXY_TARGET: "mock",
};

for (let index = 0; index < rawArgs.length; index += 1) {
	const current = rawArgs[index];
	if (current === "--") {
		astroArgs.push(...rawArgs.slice(index + 1));
		break;
	}

	if (current === "--host" || current === "--port") {
		const value = rawArgs[index + 1];
		if (!value) {
			throw new Error(`${current} requires a value.`);
		}
		astroArgs.push(current, value);
		index += 1;
		continue;
	}

	const envKey = flagMap[current];
	if (!envKey) {
		throw new Error(`Unknown flag: ${current}`);
	}
	const value = rawArgs[index + 1];
	if (!value) {
		throw new Error(`${current} requires a value.`);
	}
	env[envKey] = value;
	index += 1;
}

if (!astroArgs.includes("--host")) {
	astroArgs.push("--host", "127.0.0.1");
}

if (!astroArgs.includes("--port")) {
	astroArgs.push("--port", "4321");
}

const child = spawn("pnpm", astroArgs, {
	stdio: "inherit",
	env,
});

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 0);
});
