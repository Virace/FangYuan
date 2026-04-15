export type ArtalkApiConfig = {
	apiBase: string;
	siteName: string;
};

type ArtalkEndpointParams = Record<string, string | number | boolean | undefined>;

export function normalizeArtalkApiConfig(
	config: ArtalkApiConfig,
): Required<ArtalkApiConfig> {
	const trimmed = config.apiBase.trim().replace(/\/+$/, "");

	return {
		apiBase: trimmed.endsWith("/api/v2") ? trimmed.slice(0, -7) : trimmed,
		siteName: config.siteName.trim(),
	};
}

export function buildArtalkEndpoint(
	config: ArtalkApiConfig,
	pathname: string,
	params?: ArtalkEndpointParams,
): string {
	const normalizedConfig = normalizeArtalkApiConfig(config);
	const baseOrigin =
		typeof window !== "undefined" ? window.location.origin : "http://localhost";
	const url = new URL(`${normalizedConfig.apiBase}${pathname}`, baseOrigin);

	for (const [key, value] of Object.entries(params ?? {})) {
		if (value !== undefined && value !== "") {
			url.searchParams.set(key, String(value));
		}
	}

	return url.toString();
}

export async function fetchArtalkJson<T>(
	config: ArtalkApiConfig,
	pathname: string,
	options?: {
		params?: ArtalkEndpointParams;
		init?: RequestInit;
	},
): Promise<T> {
	const normalizedConfig = normalizeArtalkApiConfig(config);

	try {
		const response = await fetch(
			buildArtalkEndpoint(normalizedConfig, pathname, options?.params),
			{
				mode: "cors",
				...options?.init,
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					...(options?.init?.headers ?? {}),
				},
			},
		);

		if (!response.ok) {
			const payload = await response.text();

			try {
				const parsed = JSON.parse(payload) as { msg?: string };
				throw new Error(parsed.msg || `Artalk API request failed: ${response.status}`);
			} catch {
				throw new Error(payload || `Artalk API request failed: ${response.status}`);
			}
		}

		return (await response.json()) as T;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(
				`Artalk API request failed. Verify apiBase, siteName, and trusted origin/CORS. ${error.message}`,
			);
		}

		throw error;
	}
}
