type Vertex = readonly [number, number, number];

// 腰棱、冠部和台面共用顶点，侧视时各刻面仍然相接。
const girdle: Vertex[] = [
	[0, -42, 3],
	[19, -22, 3],
	[37, 0, 3],
	[19, 22, 3],
	[0, 42, 3],
	[-19, 22, 3],
	[-37, 0, 3],
	[-19, -22, 3],
];
const table: Vertex[] = [
	[-2, -20, 23],
	[10, -10, 23],
	[16, 0, 23],
	[9, 10, 23],
	[-2, 18, 23],
	[-12, 10, 23],
	[-19, 0, 23],
	[-12, -11, 23],
];
const palette = [
	[99, 161, 195],
	[165, 166, 213],
	[168, 129, 183],
	[103, 110, 167],
	[95, 120, 162],
	[76, 160, 184],
	[136, 196, 210],
	[121, 158, 203],
];

function cut(vertices: Vertex[], color: number[], opacity: number) {
	const [a, b, c] = vertices;
	const ux = b[0] - a[0];
	const uy = b[1] - a[1];
	const uz = b[2] - a[2];
	const vx = c[0] - a[0];
	const vy = c[1] - a[1];
	const vz = c[2] - a[2];
	const nx = uy * vz - uz * vy;
	const ny = uz * vx - ux * vz;
	const nz = ux * vy - uy * vx;
	const length = Math.hypot(nx, ny, nz);
	return {
		vertices,
		color,
		opacity,
		nx: nx / length,
		ny: ny / length,
		nz: nz / length,
	};
}

const facets = girdle.flatMap((a, i) => {
	const j = (i + 1) % girdle.length;
	const b = girdle[j];
	const waistA: Vertex = [a[0] * 0.94, a[1] * 0.94, -4];
	const waistB: Vertex = [b[0] * 0.94, b[1] * 0.94, -4];
	return [
		cut([waistA, waistB, b, a], palette[i], 0.56),
		cut([a, b, table[i]], palette[i], 0.39),
		cut([b, table[j], table[i]], palette[(i + 6) % 8], 0.28),
	];
});
facets.push(cut(table, [138, 187, 206], 0.17));

export function projectDiamond(relief: { x: number; y: number }): {
	points: string;
	fill: string;
	opacity: number;
}[] {
	const hx = -relief.x - 0.52;
	const hy = -relief.y - 0.68;
	const lightLength = Math.hypot(hx, hy, 1);
	return facets.map(({ vertices, color, opacity, nx, ny, nz }) => {
		const facing = nz - nx * relief.x - ny * relief.y;
		const light = Math.max(0, (nx * hx + ny * hy + nz) / lightLength);
		const gloss = 150 * light ** 12;
		const fill = color.map((channel) =>
			Math.min(255, Math.round(channel * (0.37 + 0.71 * light) + gloss)),
		);
		return {
			points: vertices
				.map(
					([x, y, z]) =>
						`${(x + z * relief.x).toFixed(2)},${(y + z * relief.y).toFixed(2)}`,
				)
				.join(" "),
			fill: `rgb(${fill.join(" ")})`,
			opacity: facing > 0 ? opacity + 0.23 * light ** 12 : 0,
		};
	});
}
