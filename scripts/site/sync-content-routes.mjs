import { open, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { parse, stringify } from "yaml";
import {
	appendRoutePaths,
	parseRouteRegistry,
} from "../../src/utils/content-route-history.ts";
import {
	assertRouteSnapshot,
	readRouteSnapshot,
	sourceDigest,
} from "../../src/utils/content-route-store.ts";
import { resolveSiteSourceContext } from "../../src/utils/site-source/context.ts";

async function recoverSync() {
	const context = resolveSiteSourceContext();
	const siteRoot = context.useExternalContent
		? context.siteRoot
		: process.cwd();
	const lockPath = path.join(siteRoot, ".editor", "save-lock.json");
	const registryPath = path.join(siteRoot, "content-routes.yaml");
	const record = JSON.parse(await readFile(lockPath, "utf8"));
	if (record.kind !== "route-sync" || typeof record.registryText !== "string")
		throw new Error("此恢复记录属于 Studio，请在 Studio 恢复保存。");
	parseRouteRegistry(parse(record.registryText));
	let currentText = null;
	try {
		currentText = await readFile(registryPath, "utf8");
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	if (currentText !== record.registryText) {
		if (
			(currentText === null ? null : sourceDigest(currentText)) !==
			record.registryBaseline
		)
			throw new Error(
				"路径登记在中断后又被修改，已保留恢复记录；请先处理登记冲突。",
			);
		await writeFile(registryPath, record.registryText, "utf8");
	}
	await unlink(lockPath);
	console.log("已完成中断的路径登记同步。请重新构建核对当前文章。");
}

if (process.argv.includes("--recover")) {
	await recoverSync();
} else {
	// 默认只展示拟写登记，--write 是作者对本次同步的明确调用。
	const snapshot = readRouteSnapshot();
	let registry = snapshot.registry;
	for (const route of snapshot.routes)
		if (route.contentId)
			registry = appendRoutePaths(registry, route.contentId, [
				route.publicPath,
			]);
	assertRouteSnapshot({ ...snapshot, registry });
	const registryText = stringify(registry);
	if (!process.argv.includes("--write")) {
		process.stdout.write(registryText);
		process.stderr.write(
			"以上为拟写 content-routes.yaml；确认后加 --write 写入。无 ID 旧文章不自动接管。\n",
		);
	} else {
		const current = readRouteSnapshot();
		if (current.inputDigest !== snapshot.inputDigest)
			throw new Error("内容或登记已变化，请重新审阅同步结果。");
		const editorRoot = path.join(snapshot.siteRoot, ".editor");
		mkdirSync(editorRoot, { recursive: true });
		const lockPath = path.join(editorRoot, "save-lock.json");
		const lock = await open(lockPath, "wx");
		await lock.writeFile(
			JSON.stringify({
				kind: "route-sync",
				registryBaseline: snapshot.registryBaseline,
				registryText,
			}),
		);
		await lock.close();
		try {
			let currentText = null;
			try {
				currentText = await readFile(snapshot.registryPath, "utf8");
			} catch (error) {
				if (error.code !== "ENOENT") throw error;
			}
			if (
				(currentText === null ? null : sourceDigest(currentText)) !==
				snapshot.registryBaseline
			)
				throw new Error("路径登记已变化，请重新同步。");
			await writeFile(snapshot.registryPath, registryText, "utf8");
			await unlink(lockPath);
			console.log("已同步 content-routes.yaml，既有历史路径全部保留。");
		} catch (error) {
			throw new Error(
				`同步未完成，恢复记录保留在 .editor/save-lock.json。${error.message}`,
				{ cause: error },
			);
		}
	}
}
