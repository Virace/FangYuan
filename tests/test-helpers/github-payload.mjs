export function githubPayload(repo, overrides = {}) {
	return {
		full_name: repo,
		private: false,
		visibility: "public",
		description: `Built snapshot for ${repo}`,
		language: "TypeScript",
		stargazers_count: 123,
		forks_count: 4,
		license: { spdx_id: "MIT", name: "MIT License" },
		owner: { avatar_url: "https://avatars.githubusercontent.com/u/1?v=4" },
		...overrides,
	};
}
