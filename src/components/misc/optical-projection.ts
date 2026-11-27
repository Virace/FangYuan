export interface OpticalProjection {
	lens: string;
	incoming: string;
	outgoing: string;
	transmission: string;
	glint: string;
}

interface OpticalView extends OpticalProjection {
	surfaces: Record<"back" | "spacer" | "frame" | "barrel" | "lens", string>;
	rays: Record<"incoming" | "outgoing", string>;
	relief: { x: number; y: number };
	exitRadius: number;
}

const lensDepth = 22;
const prismSpacerDepth = -2;

export function prismRadius(profile: number[], angle: number): number {
	const turn = angle / (2 * Math.PI);
	const sample = (turn - Math.floor(turn)) * profile.length;
	const index = Math.floor(sample) % profile.length;
	const fraction = sample - Math.floor(sample);
	return (
		profile[index] +
		(profile[(index + 1) % profile.length] - profile[index]) * fraction
	);
}

export function projectOptics(
	horizontal: number,
	vertical: number,
	prismProfile?: number[],
	angle = 0,
): OpticalView {
	const entry = prismProfile
		? -prismRadius(prismProfile, angle + Math.PI)
		: -74;
	const exit = prismProfile ? prismRadius(prismProfile, angle) : 77;
	const yaw = -0.34 + horizontal * 0.52;
	const pitch = 0.16 - vertical * 0.41;
	const roll = -0.14 + horizontal * 0.07;
	const cy = Math.cos(yaw);
	const sy = Math.sin(yaw);
	const cp = Math.cos(pitch);
	const sp = Math.sin(pitch);
	const cr = Math.cos(roll);
	const sr = Math.sin(roll);
	const a = cr * cy - sr * sp * sy;
	const b = sr * cy + cr * sp * sy;
	const c = -sr * cp;
	const d = cr * cp;
	const depthX = cr * sy + sr * sp * cy;
	const depthY = sr * sy - cr * sp * cy;
	const x = horizontal * 16;
	const y = vertical * 10;
	const surface = (depth: number) =>
		`translate(${((x + depth * depthX) / 480) * 100}%, ${((y + depth * depthY) / 330) * 100}%) matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
	const determinant = a * d - b * c;
	const lens = surface(lensDepth);
	const beam = (edge: number, slope: number, width: number) => {
		const u = (d * width - c * slope) / determinant;
		const v = (a * slope - b * width) / determinant;
		return {
			svg: `matrix(${u} ${v} 0 1 ${edge} 0)`,
			css: `${lens} rotate(${angle}rad) translateX(${(edge / 480) * 100}%) matrix(${u}, ${v}, 0, 1, 0, 0)`,
		};
	};
	const incoming = beam(entry, -0.075 + vertical * 0.025, 1);
	const outgoing = beam(
		exit,
		-0.04 - vertical * 0.26 + horizontal * 0.075,
		1 + horizontal * 0.19,
	);

	return {
		exitRadius: exit,
		relief: {
			x: (d * depthX - c * depthY) / determinant,
			y: (a * depthY - b * depthX) / determinant,
		},
		surfaces: {
			back: surface(prismProfile ? -26 : -48),
			spacer: surface(-30),
			frame: surface(prismProfile ? prismSpacerDepth : -12),
			barrel: surface(6),
			lens,
		},
		rays: { incoming: incoming.css, outgoing: outgoing.css },
		lens: `matrix(${a} ${b} ${c} ${d} ${x + lensDepth * depthX} ${y + lensDepth * depthY})`,
		incoming: incoming.svg,
		outgoing: outgoing.svg,
		transmission: `matrix(${exit - entry} 0 0 1 ${entry} 0)`,
		glint: `translate(${horizontal * -24} ${vertical * -17})`,
	};
}

export function projectPrismGuide(
	points: [number, number][],
	angle: number,
	view: OpticalView,
): { path: string; opacity: number } {
	const [tipX, tipY] = points[points.length - 1];
	const length = Math.hypot(tipX, tipY);
	const dx = Math.cos(angle);
	const dy = Math.sin(angle);
	const alignment = length ? Math.max(0, (tipX * dx + tipY * dy) / length) : 0;
	const reach = Math.min(1, view.exitRadius / (length || 1));
	const opacity = alignment ** 9 * reach ** 2;
	if (opacity < 0.001) return { path: "", opacity: 0 };

	// 沿刻槽走到出口前的一段，再跨过隔层与正面的视差接上光谱。
	const limit = view.exitRadius * 0.84;
	let [x, y] = points[0];
	let path = `M${x} ${y}`;
	let radius = Math.hypot(x, y);
	for (const [nextX, nextY] of points.slice(1)) {
		const nextRadius = Math.hypot(nextX, nextY);
		if (nextRadius > limit && nextRadius > radius) {
			const t = Math.max(0, (limit - radius) / (nextRadius - radius));
			path += `L${x + (nextX - x) * t} ${y + (nextY - y) * t}`;
			break;
		}
		path += `L${nextX} ${nextY}`;
		x = nextX;
		y = nextY;
		radius = nextRadius;
	}
	const depth = lensDepth - prismSpacerDepth;
	const exitX = dx * view.exitRadius + depth * view.relief.x;
	const exitY = dy * view.exitRadius + depth * view.relief.y;
	return { path: `${path}L${exitX} ${exitY}`, opacity };
}
