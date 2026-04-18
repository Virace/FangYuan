export const MIN_RADIUS_LEVEL = 0;
export const MAX_RADIUS_LEVEL = 6;
export const DEFAULT_RADIUS_LEVEL = 3;

export const RADIUS_LEVEL_SCALE_MAP: Record<number, number> = {
	0: 0,
	1: 0.35,
	2: 0.7,
	3: 1,
	4: 1.2,
	5: 1.35,
	6: 1.5,
};

export function clampRadiusLevel(
	value: number | string | null | undefined,
	fallback: number = DEFAULT_RADIUS_LEVEL,
): number {
	const parsed =
		typeof value === "number"
			? value
			: Number.parseInt(String(value ?? ""), 10);
	if (Number.isNaN(parsed)) {
		return fallback;
	}
	return Math.min(MAX_RADIUS_LEVEL, Math.max(MIN_RADIUS_LEVEL, parsed));
}

export function getRadiusScale(level: number): number {
	return (
		RADIUS_LEVEL_SCALE_MAP[clampRadiusLevel(level)] ??
		RADIUS_LEVEL_SCALE_MAP[DEFAULT_RADIUS_LEVEL]
	);
}
