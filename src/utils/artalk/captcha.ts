import type {
	CommentCaptchaChallenge,
	CommentCaptchaState,
	VerifyCommentCaptchaInput,
} from "../comments/provider";
import {
	type ArtalkApiConfig,
	ArtalkApiError,
	buildArtalkEndpoint,
	fetchArtalkJson,
	normalizeArtalkApiConfig,
} from "./core";

type ArtalkCaptchaImageResponse = {
	img_data?: string;
};

type ArtalkCaptchaStatusResponse = {
	is_pass: boolean;
};

type ArtalkCaptchaMetadata = Record<string, string>;

function toCaptchaMetadata(value: unknown): ArtalkCaptchaMetadata {
	if (!value || typeof value !== "object") {
		return {};
	}

	return Object.fromEntries(
		Object.entries(value).flatMap(([key, item]) => {
			if (item === undefined || item === null) {
				return [];
			}

			if (
				typeof item === "string" ||
				typeof item === "number" ||
				typeof item === "boolean"
			) {
				return [[key, String(item)]];
			}

			return [];
		}),
	);
}

async function fetchArtalkCaptchaChallenge(
	config: ArtalkApiConfig,
): Promise<CommentCaptchaChallenge> {
	const normalizedConfig = normalizeArtalkApiConfig(config);
	const response = await fetch(
		buildArtalkEndpoint(normalizedConfig, "/api/v2/captcha/"),
		{
			mode: "cors",
			credentials: "include",
			headers: {
				Accept: "application/json, text/html",
			},
		},
	);
	const payload = await response.text();

	if (!response.ok) {
		throw new ArtalkApiError(
			payload || `Artalk captcha request failed: ${response.status}`,
			{
				status: response.status,
				data: payload,
			},
		);
	}

	const contentType = response.headers.get("content-type") || "";

	if (contentType.includes("text/html")) {
		return {
			kind: "html",
			html: payload,
		};
	}

	try {
		const parsed = JSON.parse(payload) as ArtalkCaptchaImageResponse &
			Record<string, unknown>;

		if (typeof parsed.img_data === "string" && parsed.img_data.length > 0) {
			return {
				kind: "image",
				imageData: parsed.img_data,
				metadata: toCaptchaMetadata(parsed),
			};
		}

		return {
			kind: "custom",
			metadata: toCaptchaMetadata(parsed),
		};
	} catch {
		return {
			kind: "html",
			html: payload,
		};
	}
}

export function createArtalkCaptchaApi(config: ArtalkApiConfig) {
	const normalizedConfig = normalizeArtalkApiConfig(config);

	return {
		getStatus() {
			return fetchArtalkJson<ArtalkCaptchaStatusResponse>(
				normalizedConfig,
				"/api/v2/captcha/status/",
			);
		},

		getChallenge() {
			return fetchArtalkCaptchaChallenge(normalizedConfig);
		},

		async verifyCaptcha(input: VerifyCommentCaptchaInput) {
			try {
				await fetchArtalkJson<Record<string, never>>(
					normalizedConfig,
					"/api/v2/captcha/verify/",
					{
						init: {
							method: "POST",
							body: JSON.stringify({
								value: input.value,
							}),
						},
					},
				);

				return {
					verified: true,
					challenge: null,
					error: null,
				} as const;
			} catch (error) {
				if (error instanceof ArtalkApiError) {
					const nextChallengeData =
						error.status === 403 && error.data && typeof error.data === "object"
							? (error.data as ArtalkCaptchaImageResponse &
									Record<string, unknown>)
							: null;

					if (typeof nextChallengeData?.img_data === "string") {
						return {
							verified: false,
							challenge: {
								kind: "image",
								imageData: nextChallengeData.img_data,
								metadata: toCaptchaMetadata(nextChallengeData),
							} satisfies CommentCaptchaChallenge,
							error,
						} as const;
					}
				}

				throw error;
			}
		},
	};
}

export function createArtalkCaptchaService(config: ArtalkApiConfig) {
	const artalkCaptchaApi = createArtalkCaptchaApi(config);

	return {
		async getState(): Promise<CommentCaptchaState> {
			const status = await artalkCaptchaApi.getStatus();

			if (status.is_pass) {
				return {
					required: false,
					verified: true,
					challenge: null,
				};
			}

			return {
				required: true,
				verified: false,
				challenge: await artalkCaptchaApi.getChallenge(),
			};
		},

		async refresh(): Promise<CommentCaptchaState> {
			return {
				required: true,
				verified: false,
				challenge: await artalkCaptchaApi.getChallenge(),
			};
		},

		async verify(
			input: VerifyCommentCaptchaInput,
		): Promise<CommentCaptchaState> {
			const result = await artalkCaptchaApi.verifyCaptcha(input);

			if (result.verified) {
				return {
					required: true,
					verified: true,
					challenge: null,
				};
			}

			return {
				required: true,
				verified: false,
				challenge: result.challenge ?? null,
			};
		},
	};
}
