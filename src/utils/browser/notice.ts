export type AutoDismissTone = "success" | "error" | "info";

const noticeProfiles: Record<
	AutoDismissTone,
	{ baseMs: number; perCharMs: number; minMs: number; maxMs: number }
> = {
	success: {
		baseMs: 2200,
		perCharMs: 45,
		minMs: 2600,
		maxMs: 7000,
	},
	info: {
		baseMs: 2800,
		perCharMs: 55,
		minMs: 3400,
		maxMs: 8200,
	},
	error: {
		baseMs: 4200,
		perCharMs: 70,
		minMs: 4800,
		maxMs: 10000,
	},
};

export function getAutoDismissMs(
	message: string,
	tone: AutoDismissTone,
): number {
	const contentLength = Array.from(message.trim()).length;
	if (contentLength === 0) {
		return 0;
	}

	const profile = noticeProfiles[tone];
	const estimatedMs = profile.baseMs + contentLength * profile.perCharMs;
	return Math.min(profile.maxMs, Math.max(profile.minMs, estimatedMs));
}
