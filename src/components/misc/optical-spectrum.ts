const spectrumEdges = [0, 90, 270, 630, 1350, 2790, 5670];
// 光谱纹理由窄到宽扩展一倍，首尾各留本段长度的 4% 和 8%，让相邻段的透明边缘衔接。
const sliceBleed = 0.04;

export function projectSpectrum(deflection = 0): {
	segments: string[];
	envelope: string;
} {
	const points = spectrumEdges.map((x) => ({
		x,
		y: -0.115 * x + deflection * (x + 150 * Math.expm1(-x / 150)),
		radius: 15 + x / 6,
	}));
	const segments = points.slice(1).map((end, index) => {
		const start = points[index];
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const span = 1 + 3 * sliceBleed;
		const radius = start.radius * (2 + 2 * sliceBleed);
		return `matrix(${dx * span} ${dy * span} 0 ${2 * radius} ${start.x - dx * sliceBleed} ${start.y - dy * sliceBleed - radius})`;
	});
	const top = points.map(({ x, y, radius }) => `${x} ${y - radius * 0.65}`);
	const bottom = points
		.map(({ x, y, radius }) => `${x} ${y + radius * 0.65}`)
		.reverse();
	return { segments, envelope: `M${top.join("L")}L${bottom.join("L")}Z` };
}
