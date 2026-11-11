import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { htmlToHast } from "satteri";
import { createBuildRun } from "./test-helpers/build-artifact.mjs";

function descendants(node, predicate) {
	return [...(predicate(node) ? [node] : []), ...(node.children ?? []).flatMap(child => descendants(child, predicate))];
}
function text(node) { return node.value ?? (node.children ?? []).map(text).join(""); }
function field(card, className) {
	return descendants(card, node => node.properties?.className?.includes(className))[0];
}

test("GitHub snapshots refresh on unchanged cached content and recover after offline builds", { timeout: 300_000 }, async t => {
	const run = await createBuildRun(t);
	const scenario = await run.createScenario("github-cache");
	await writeFile(scenario.siteConfigPath, `siteConfig:\n  site: https://github-build.example.test\n  permalink:\n    postsPattern: /%slug%\n    pagesPattern: /%slug%\n`, "utf8");
	await writeFile(scenario.siteAboutPath, "# About\n", "utf8");
	const articlePath = path.join(scenario.postDir, "github.md");
	await writeFile(articlePath, `---\ntitle: GitHub Cache Contract\npublished: 2026-11-11\ndraft: false\n---\n\n::github{repo="Owner/Repo"}\n\n::github{repo="owner/repo"}\n`, "utf8");
	const articleStat = await stat(articlePath);
	const fixturePath = path.join(scenario.scenarioRoot, "github-fixture.json");
	const callsFile = path.join(scenario.scenarioRoot, "github-calls.jsonl");
	const fakeToken = "github-test-token";
	const env = { FANGYUAN_TEST_GITHUB_FIXTURE: fixturePath, GITHUB_TOKEN: fakeToken };
	const builds = [
		{ status: 403 },
		{ overrides: { description: "Snapshot A", stargazers_count: 42 } },
		{ overrides: { full_name: "NewOwner/Renamed", description: null, language: null, license: null, owner: null, stargazers_count: 0, forks_count: 0 } },
		{ status: 429 },
	];
	for (let index = 0; index < builds.length; index++) {
		await writeFile(fixturePath, JSON.stringify({ ...builds[index], callsFile, expectedToken: fakeToken }), "utf8");
		const artifact = run.buildScenario(scenario, { rebuild: index > 0, env });
		const html = await readFile(path.join(artifact.outDir, "github", "index.html"), "utf8");
		const cards = descendants(htmlToHast(html), node => node.tagName === "a" && node.properties?.className?.includes("card-github"));
		assert.equal(cards.length, 2);
		for (const card of cards) {
			if (index === 0 || index === 3) {
				assert.equal(card.properties.href.toLowerCase(), "https://github.com/owner/repo");
				assert.equal(field(card, "gc-description").properties.hidden, true);
				assert.equal(field(card, "gc-infobar").properties.hidden, true);
			} else if (index === 1) {
				assert.equal(text(field(card, "gc-description")), "Snapshot A");
				assert.equal(text(field(card, "gc-stars")), "42");
			} else {
				assert.equal(card.properties.href, "https://github.com/NewOwner/Renamed");
				assert.equal(field(card, "gc-description").properties.hidden, true);
				assert.equal(field(card, "gc-license").properties.hidden, true);
				assert.equal(text(field(card, "gc-stars")), "0");
				assert.equal(text(field(card, "gc-forks")), "0");
			}
		}
		assert.equal(html.includes(fakeToken), false);
		assert.equal(artifact.output.includes(fakeToken), false);
		const calls = (await readFile(callsFile, "utf8")).trim().split("\n").map(line => JSON.parse(line));
		assert.equal(calls.length, index + 1, "duplicate cards share one request per build");
		assert.ok(calls.every(call => call.authenticated));
		assert.equal((await stat(articlePath)).mtimeMs, articleStat.mtimeMs);
		assert.ok((await readdir(scenario.cacheDir)).length > 0, "the same Astro cache is retained between builds");
	}
	assert.equal(run.buildCount, 4);
});
