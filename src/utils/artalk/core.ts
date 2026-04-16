export type ArtalkApiConfig = {
	apiBase: string;
	siteName: string;
};

type ArtalkEndpointParams = Record<
	string,
	string | number | boolean | undefined
>;

export class ArtalkApiError extends Error {
	readonly status: number | null;
	readonly data: unknown;

	constructor(
		message: string,
		options?: {
			status?: number | null;
			data?: unknown;
		},
	) {
		super(message);
		this.name = "ArtalkApiError";
		this.status = options?.status ?? null;
		this.data = options?.data;
	}
}

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

function logArtalkRequestError(
	config: Required<ArtalkApiConfig>,
	pathname: string,
	error: ArtalkApiError | Error,
) {
	console.error("[Artalk request failed]", {
		apiBase: config.apiBase,
		siteName: config.siteName,
		pathname,
		status: error instanceof ArtalkApiError ? error.status : null,
		message: error.message,
		data: error instanceof ArtalkApiError ? error.data : undefined,
	});
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
				credentials: options?.init?.credentials ?? "include",
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
			let data: unknown = payload;
			let message = payload || `Artalk API request failed: ${response.status}`;

			try {
				const parsed = JSON.parse(payload) as { msg?: string };
				data = parsed;
				message = parsed.msg || message;
			} catch {
				// keep plain text payload
			}

			throw new ArtalkApiError(message, {
				status: response.status,
				data,
			});
		}

		return (await response.json()) as T;
	} catch (error) {
		if (error instanceof ArtalkApiError) {
			logArtalkRequestError(normalizedConfig, pathname, error);
			throw error;
		}

		if (error instanceof Error) {
			logArtalkRequestError(normalizedConfig, pathname, error);
			throw new ArtalkApiError(error.message || "Artalk API request failed.", {
				data: error,
			});
		}

		throw error;
	}
}
