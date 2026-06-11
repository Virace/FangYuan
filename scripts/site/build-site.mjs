import { spawn } from "node:child_process";
import { cp, rm } from "node:fs/promises";
import { resolveSiteBuildPaths } from "./build-paths.mjs";

const { finalOutDir, outDir, pagefindSite, shouldCopyOutDir } =
	resolveSiteBuildPaths();

function runPnpm(args) {
	return new Promise((resolve, reject) => {
		const command =
			process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
		const commandArgs =
			process.platform === "win32" ? ["/d", "/s", "/c", "pnpm", ...args] : args;
		const commandLabel = `pnpm ${args.join(" ")}`;
		const child = spawn(command, commandArgs, {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		child.on("error", reject);
		child.on("exit", (code, signal) => {
			if (signal) {
				reject(new Error(`${commandLabel} exited by ${signal}`));
				return;
			}
			if (code) {
				reject(new Error(`${commandLabel} failed with exit code ${code}`));
				return;
			}
			resolve();
		});
	});
}

await runPnpm(["exec", "astro", "build"]);
if (shouldCopyOutDir && outDir) {
	await rm(finalOutDir, { recursive: true, force: true });
	await cp(outDir, finalOutDir, { recursive: true });
}
await runPnpm(["exec", "pagefind", "--site", pagefindSite]);
