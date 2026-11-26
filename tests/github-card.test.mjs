import assert from "node:assert/strict";
import test from "node:test";
import { fetchGithubRepository, getGithubCardFields, normalizeGithubRepo, parseGithubRepository } from "../src/utils/github-repo.ts";
import { GithubCardComponent } from "../src/plugins/rehype-component-github-card.mjs";
import { githubPayload } from "./test-helpers/github-payload.mjs";

test("GitHub repository snapshots accept public REST data and preserve null and zero", () => {
	const snapshot = parseGithubRepository(githubPayload("NewOwner/Renamed", {
		description: null, language: null, license: null, owner: null,
		stargazers_count: 0, forks_count: 0,
	}));
	assert.deepEqual(getGithubCardFields("OldOwner/OldName", snapshot), {
		owner: "NewOwner", name: "Renamed", href: "https://github.com/NewOwner/Renamed",
		description: null, language: null, license: null, avatarUrl: null, stars: "0", forks: "0",
	});
});

test("GitHub error objects, private payloads and invalid statistics cannot become public cards", () => {
	for (const value of [
		{ message: "API rate limit exceeded" },
		githubPayload("Owner/Repo", { private: true }),
		githubPayload("Owner/Repo", { visibility: "private" }),
		githubPayload("Owner/Repo", { stargazers_count: -1 }),
		githubPayload("Owner/Repo", { forks_count: "0" }),
		githubPayload("https://example.test/Repo"),
	]) assert.equal(parseGithubRepository(value), null);
	const snapshot = parseGithubRepository(githubPayload("Owner/Repo", { owner: { avatar_url: "javascript:alert(1)" } }));
	assert.equal(snapshot.avatarUrl, null);
	assert.equal(normalizeGithubRepo("Owner/Repo?token=secret"), null);
	assert.equal(normalizeGithubRepo("Owner/Repo/extra"), null);
});

test("GitHub requests distinguish non-OK responses and invalid JSON from valid snapshots", async () => {
	for (const response of [
		new Response(JSON.stringify(githubPayload("Owner/Repo")), { status: 403 }),
		new Response(JSON.stringify({ message: "rate limited" }), { status: 429 }),
		new Response("invalid JSON", { status: 200 }),
	]) assert.equal(await fetchGithubRepository("Owner/Repo", { fetch: async () => response }), null);
	assert.equal(await fetchGithubRepository("Owner/Repo", {
		fetch: async () => { throw new TypeError("Network unavailable"); },
	}), null);
	const snapshot = await fetchGithubRepository("Owner/Repo", {
		fetch: async (url, options) => {
			assert.equal(url, "https://api.github.com/repos/Owner/Repo");
			assert.equal(new Headers(options.headers).get("Authorization"), null);
			assert.ok(options.signal instanceof AbortSignal);
			return new Response(JSON.stringify(githubPayload("Owner/Repo")));
		},
	});
	assert.equal(snapshot.fullName, "Owner/Repo");
});

test("GitHub directive base card contains a usable repository link and unknown statistics", () => {
	const card = GithubCardComponent({ repo: "Owner/Repo" }, []);
	assert.equal(card.tagName, "a");
	assert.equal(card.properties.href, "https://github.com/Owner/Repo");
	assert.equal(card.properties.dataGithubRepo, "Owner/Repo");
	const content = card.children.find(node => node.properties?.className?.includes("gc-content"));
	assert.equal(content.children.find(node => node.properties?.className?.includes("gc-infobar")).properties.hidden, true);
	assert.equal(card.children.some(node => node.tagName === "script"), false);
});
