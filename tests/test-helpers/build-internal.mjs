import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const preload = new URL("./github-fetch.mjs", import.meta.url).href;
const buildScript = fileURLToPath(new URL("../../scripts/site/build-site.mjs", import.meta.url));
const child = spawn(process.execPath, [buildScript], {
	stdio: "inherit",
	env: {
		...process.env,
		FANGYUAN_SITE_MODE: "internal",
		GITHUB_TOKEN: "",
		NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${preload}`.trim(),
	},
});
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
