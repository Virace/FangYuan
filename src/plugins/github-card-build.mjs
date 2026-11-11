import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hastToHtml, htmlToHast } from "satteri";
import {
	fetchGithubRepository,
	normalizeGithubRepo,
} from "../utils/github-repo.ts";
import { renderGithubCard } from "./rehype-component-github-card.mjs";

function findCards(node, cards = []) {
	if (node.type === "element" && node.tagName === "a") {
		const repo = normalizeGithubRepo(
			node.properties?.["data-github-repo"] ?? node.properties?.dataGithubRepo,
		);
		if (repo && node.properties?.className?.includes("card-github"))
			cards.push({ node, repo });
	}
	for (const child of node.children ?? []) findCards(child, cards);
	return cards;
}

async function getHtmlFiles(directory) {
	const files = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await getHtmlFiles(entryPath)));
		else if (entry.isFile() && entry.name.endsWith(".html"))
			files.push(entryPath);
	}
	return files;
}

/** 在内容缓存之后增强本轮 HTML；快照只存在于产物与本次构建内存中。 */
export function githubCardBuildIntegration() {
	return {
		name: "fangyuan-github-cards",
		hooks: {
			"astro:build:generated": async ({ dir, logger }) => {
				const pages = [];
				const repos = new Map();
				for (const filePath of await getHtmlFiles(fileURLToPath(dir))) {
					const html = await readFile(filePath, "utf8");
					if (!html.includes("data-github-repo=")) continue;
					const tree = htmlToHast(html);
					const cards = findCards(tree);
					if (!cards.length) continue;
					pages.push({ filePath, tree, cards });
					for (const { repo } of cards) repos.set(repo.toLowerCase(), repo);
				}
				if (!repos.size) return;
				const startedAt = performance.now();
				const token = process.env.GITHUB_TOKEN?.trim();
				const headers = token ? { Authorization: `Bearer ${token}` } : {};
				const snapshots = new Map();
				const pending = [...repos];
				async function fetchNext() {
					for (let entry = pending.shift(); entry; entry = pending.shift()) {
						const [key, repo] = entry;
						snapshots.set(key, await fetchGithubRepository(repo, { headers }));
					}
				}
				await Promise.all(
					Array.from({ length: Math.min(4, repos.size) }, fetchNext),
				);
				for (const { filePath, tree, cards } of pages) {
					for (const { node, repo } of cards)
						Object.assign(
							node,
							renderGithubCard(repo, snapshots.get(repo.toLowerCase())),
						);
					await writeFile(filePath, hastToHtml(tree), "utf8");
				}
				const enrichedCount = [...snapshots.values()].filter(Boolean).length;
				logger.info(
					`GitHub cards: ${enrichedCount}/${repos.size} public snapshots (${Math.round(performance.now() - startedAt)}ms); remaining cards keep repository links.`,
				);
			},
		},
	};
}
