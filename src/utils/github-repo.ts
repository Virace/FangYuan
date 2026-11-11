export interface GithubRepository {
	fullName: string;
	description: string | null;
	language: string | null;
	stars: number;
	forks: number;
	license: string | null;
	avatarUrl: string | null;
}

export interface GithubCardFields {
	owner: string;
	name: string;
	href: string;
	description: string | null;
	language: string | null;
	stars: string | null;
	forks: string | null;
	license: string | null;
	avatarUrl: string | null;
}

interface GithubFetchOptions {
	fetch?: typeof globalThis.fetch;
	headers?: Record<string, string>;
	signal?: AbortSignal;
	timeoutMs?: number;
}

export const GITHUB_REQUEST_TIMEOUT_MS = 5_000;

export function normalizeGithubRepo(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const repo = value.trim();
	return /^[a-z\d](?:[a-z\d-]*[a-z\d])?\/[a-z\d_.-]+$/i.test(repo) &&
		!repo.endsWith("/.") &&
		!repo.endsWith("/..")
		? repo
		: null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
	return value === null || typeof value === "string";
}

function getAvatarUrl(value: unknown): string | null {
	if (typeof value !== "string") return null;
	try {
		const avatarUrl = new URL(value);
		return avatarUrl.protocol === "https:" &&
			!avatarUrl.username &&
			!avatarUrl.password
			? avatarUrl.href
			: null;
	} catch {
		return null;
	}
}

/** 只接受公开仓库的完整可展示快照，避免错误响应或私有数据覆盖卡面。 */
export function parseGithubRepository(value: unknown): GithubRepository | null {
	if (!isRecord(value)) return null;
	const fullName = normalizeGithubRepo(value.full_name);
	if (
		!fullName ||
		value.private !== false ||
		(value.visibility !== undefined && value.visibility !== "public") ||
		!isNullableString(value.description) ||
		!isNullableString(value.language) ||
		!Number.isSafeInteger(value.stargazers_count) ||
		(value.stargazers_count as number) < 0 ||
		!Number.isSafeInteger(value.forks_count) ||
		(value.forks_count as number) < 0 ||
		(value.license !== null && !isRecord(value.license))
	)
		return null;
	let license: string | null = null;
	if (isRecord(value.license)) {
		const spdx = value.license.spdx_id;
		const name = value.license.name;
		license =
			typeof spdx === "string" && spdx !== "NOASSERTION"
				? spdx
				: typeof name === "string"
					? name
					: null;
	}
	return {
		fullName,
		description: value.description,
		language: value.language,
		stars: value.stargazers_count as number,
		forks: value.forks_count as number,
		license,
		avatarUrl: isRecord(value.owner)
			? getAvatarUrl(value.owner.avatar_url)
			: null,
	};
}

const countFormatter = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

export function getGithubCardFields(
	repo: string,
	snapshot: GithubRepository | null = null,
): GithubCardFields {
	const [owner, name] = (snapshot?.fullName ?? repo).split("/");
	return {
		owner,
		name,
		href: `https://github.com/${owner}/${name}`,
		description: snapshot?.description || null,
		language: snapshot?.language || null,
		stars: snapshot ? countFormatter.format(snapshot.stars) : null,
		forks: snapshot ? countFormatter.format(snapshot.forks) : null,
		license: snapshot?.license || null,
		avatarUrl: snapshot?.avatarUrl ?? null,
	};
}

/** 请求失败返回空快照；超时包含响应正文读取，调用方保留现有内容。 */
export async function fetchGithubRepository(
	repo: string,
	options: GithubFetchOptions = {},
): Promise<GithubRepository | null> {
	const normalizedRepo = normalizeGithubRepo(repo);
	if (!normalizedRepo) return null;
	const timeout = AbortSignal.timeout(
		options.timeoutMs ?? GITHUB_REQUEST_TIMEOUT_MS,
	);
	const signal = options.signal
		? AbortSignal.any([options.signal, timeout])
		: timeout;
	try {
		const response = await (options.fetch ?? globalThis.fetch)(
			`https://api.github.com/repos/${normalizedRepo}`,
			{
				headers: {
					Accept: "application/vnd.github+json",
					"X-GitHub-Api-Version": "2022-11-28",
					...options.headers,
				},
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			},
		);
		return response.ok ? parseGithubRepository(await response.json()) : null;
	} catch {
		return null;
	}
}
