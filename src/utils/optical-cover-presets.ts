export interface OpticalCoverPreset {
	readonly id: string;
	readonly background: string;
}

/**
 * 面向无封面文章列表卡片的 12 套纯漫反射光学流体渐变画幅。
 * 品牌中立、无图形叠加，仅作用于列表卡片视觉层，不改动文章自身主图语义。
 */
export const OPTICAL_COVER_PRESETS: readonly OpticalCoverPreset[] = [
	{
		id: "indigo-cyan",
		background:
			"radial-gradient(circle at 78% 36%, rgb(216 248 255 / 0.34), transparent 40%), radial-gradient(circle at 74% 28%, rgb(138 238 255 / 0.78), transparent 44%), radial-gradient(circle at 86% 78%, rgb(228 164 255 / 0.62), transparent 48%), radial-gradient(circle at 50% 62%, rgb(255 216 172 / 0.34), transparent 52%), linear-gradient(128deg, #0d1c30 0%, #15324a 40%, #1f2948 72%, #2e2040 100%)",
	},
	{
		id: "morning-mist",
		background:
			"radial-gradient(circle at 78% 38%, rgb(255 255 255 / 0.36), transparent 42%), radial-gradient(circle at 70% 34%, rgb(255 232 198 / 0.9), transparent 46%), radial-gradient(circle at 88% 74%, rgb(118 202 216 / 0.68), transparent 48%), radial-gradient(circle at 46% 24%, rgb(212 184 230 / 0.56), transparent 52%), linear-gradient(132deg, #c9d9e0 0%, #dbe2e7 36%, #e7d9d4 70%, #bccfd6 100%)",
	},
	{
		id: "aurora-sea",
		background:
			"radial-gradient(circle at 78% 36%, rgb(200 255 242 / 0.32), transparent 42%), radial-gradient(circle at 76% 26%, rgb(116 244 218 / 0.74), transparent 45%), radial-gradient(circle at 84% 78%, rgb(104 176 255 / 0.64), transparent 48%), radial-gradient(circle at 52% 68%, rgb(255 228 172 / 0.3), transparent 52%), linear-gradient(130deg, #0a2028 0%, #103744 40%, #16304e 72%, #1d223d 100%)",
	},
	{
		id: "rose-dawn",
		background:
			"radial-gradient(circle at 78% 38%, rgb(255 244 239 / 0.34), transparent 42%), radial-gradient(circle at 70% 32%, rgb(255 210 186 / 0.88), transparent 45%), radial-gradient(circle at 86% 74%, rgb(214 156 232 / 0.66), transparent 48%), radial-gradient(circle at 48% 26%, rgb(134 212 228 / 0.52), transparent 50%), linear-gradient(132deg, #d8d4de 0%, #ead8d8 40%, #e8dfd2 72%, #c9d5e2 100%)",
	},
	{
		id: "twilight-iris",
		background:
			"radial-gradient(circle at 78% 38%, rgb(240 228 255 / 0.32), transparent 42%), radial-gradient(circle at 74% 32%, rgb(198 156 255 / 0.76), transparent 45%), radial-gradient(circle at 64% 78%, rgb(255 166 206 / 0.56), transparent 48%), radial-gradient(circle at 90% 20%, rgb(112 216 255 / 0.52), transparent 44%), linear-gradient(130deg, #161831 0%, #24224b 42%, #382552 72%, #231b3a 100%)",
	},
	{
		id: "glacier-pearl",
		background:
			"radial-gradient(circle at 78% 36%, rgb(255 255 255 / 0.38), transparent 42%), radial-gradient(circle at 72% 28%, rgb(236 250 255 / 0.92), transparent 46%), radial-gradient(circle at 86% 76%, rgb(134 198 238 / 0.68), transparent 48%), radial-gradient(circle at 46% 68%, rgb(222 192 238 / 0.54), transparent 52%), linear-gradient(130deg, #c2d4e0 0%, #d7e3eb 38%, #e2dceb 70%, #bdd1e0 100%)",
	},
	{
		id: "amber-dusk",
		background:
			"radial-gradient(circle at 78% 36%, rgb(255 238 212 / 0.32), transparent 42%), radial-gradient(circle at 72% 32%, rgb(255 204 136 / 0.82), transparent 45%), radial-gradient(circle at 86% 76%, rgb(242 136 146 / 0.6), transparent 48%), radial-gradient(circle at 48% 26%, rgb(116 210 228 / 0.4), transparent 48%), linear-gradient(132deg, #24191b 0%, #3f2827 40%, #4d2c37 72%, #232136 100%)",
	},
	{
		id: "jade-breeze",
		background:
			"radial-gradient(circle at 78% 38%, rgb(245 255 251 / 0.34), transparent 42%), radial-gradient(circle at 72% 34%, rgb(166 236 212 / 0.82), transparent 45%), radial-gradient(circle at 86% 76%, rgb(136 196 236 / 0.64), transparent 48%), radial-gradient(circle at 46% 28%, rgb(255 232 188 / 0.64), transparent 50%), linear-gradient(132deg, #c9ded9 0%, #d8e6e2 38%, #e4e2d5 72%, #bed6dc 100%)",
	},
	{
		id: "cobalt-sea",
		background:
			"radial-gradient(circle at 78% 36%, rgb(214 240 255 / 0.32), transparent 42%), radial-gradient(circle at 74% 30%, rgb(120 198 255 / 0.8), transparent 44%), radial-gradient(circle at 84% 78%, rgb(172 152 255 / 0.62), transparent 48%), radial-gradient(circle at 48% 66%, rgb(134 242 246 / 0.4), transparent 52%), linear-gradient(128deg, #0b1936 0%, #132c59 42%, #1d356b 72%, #1a2148 100%)",
	},
	{
		id: "warm-sand",
		background:
			"radial-gradient(circle at 78% 38%, rgb(255 250 240 / 0.36), transparent 42%), radial-gradient(circle at 70% 34%, rgb(255 236 204 / 0.9), transparent 46%), radial-gradient(circle at 88% 74%, rgb(134 206 214 / 0.66), transparent 48%), radial-gradient(circle at 46% 70%, rgb(238 190 176 / 0.56), transparent 52%), linear-gradient(132deg, #d8d2ca 0%, #e8dcd2 40%, #dbe0df 72%, #c5d4d8 100%)",
	},
	{
		id: "plum-aurora",
		background:
			"radial-gradient(circle at 78% 36%, rgb(255 239 232 / 0.32), transparent 42%), radial-gradient(circle at 72% 32%, rgb(255 186 156 / 0.78), transparent 44%), radial-gradient(circle at 86% 76%, rgb(212 138 232 / 0.62), transparent 48%), radial-gradient(circle at 46% 64%, rgb(124 214 236 / 0.36), transparent 52%), linear-gradient(132deg, #231728 0%, #3d233d 40%, #523041 72%, #291e34 100%)",
	},
	{
		id: "sky-mist",
		background:
			"radial-gradient(circle at 78% 38%, rgb(255 255 255 / 0.36), transparent 42%), radial-gradient(circle at 72% 32%, rgb(164 224 255 / 0.84), transparent 44%), radial-gradient(circle at 86% 76%, rgb(246 196 178 / 0.7), transparent 48%), radial-gradient(circle at 46% 28%, rgb(196 184 244 / 0.56), transparent 50%), linear-gradient(130deg, #c6d8e8 0%, #d8e2ee 38%, #e6dcd9 72%, #c4d5e4 100%)",
	},
];

function hashSeed(seed: string): number {
	let hash = 2166136261;
	for (let index = 0; index < seed.length; index++) {
		hash ^= seed.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/**
 * 基于文章稳定标识确定性映射到默认光学画幅预设，保证跨次构建结果一致。
 */
export function resolveOpticalCoverPreset(seed: string): OpticalCoverPreset {
	const hash = hashSeed(seed);
	return OPTICAL_COVER_PRESETS[hash % OPTICAL_COVER_PRESETS.length];
}
