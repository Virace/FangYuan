import { createRainTextureCache } from "./liquid-rain-texture-cache";
import { type RainTextures, rainColors } from "./liquid-rain-textures";
import type { OpticalTransitionRenderer, TransitionFrameState } from "./types";

const circle = Math.PI * 2;

function drawGlow(
	ctx: CanvasRenderingContext2D,
	image: CanvasImageSource,
	x: number,
	y: number,
	radius: number,
) {
	ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
}

function traceSurface(
	ctx: CanvasRenderingContext2D,
	w: number,
	y: number,
	amp: number,
	time: number,
) {
	ctx.beginPath();
	for (let x = 0; ; x = Math.min(w, x + 10)) {
		const edge =
			y +
			(Math.sin(x * 0.02 + time * 4.4) +
				0.45 * Math.cos(x * 0.046 - time * 2.9)) *
				amp;
		if (x === 0) ctx.moveTo(x, edge);
		else ctx.lineTo(x, edge);
		if (x === w) break;
	}
}

interface Drop {
	x: number;
	y: number;
	radius: number;
	speed: number;
	offset: number;
	color: number;
}

export function createLiquidRainRenderer(): OpticalTransitionRenderer {
	let drops: Drop[] = [];
	const texturesForHue = createRainTextureCache();
	let materials: RainTextures["materials"] = [];
	let tails: RainTextures["tails"] = [];
	let lastPhase: TransitionFrameState["phase"] | undefined;
	let surfaceFraction = 1;
	let entryFraction = 1;
	return {
		id: "liquid-rain",
		prepare({ width, height, startVisibleHeight }) {
			const styles = getComputedStyle(document.body);
			const hue = Number.parseFloat(styles.getPropertyValue("--hue")) || 0;
			({ materials, tails } = texturesForHue(hue));
			const count =
				innerWidth < 1024
					? Math.max(28, Math.min(34, Math.round((width * height) / 11000)))
					: 52;
			drops = Array.from({ length: count }, (_, i) => ({
				x: Math.random(),
				y: Math.random(),
				radius: 1.7 + Math.random() * 3.4,
				speed: 0.7 + Math.random() * 1.15,
				offset: Math.random() * circle,
				color: i % rainColors.length,
			}));
			lastPhase = undefined;
			const startRatio =
				startVisibleHeight && height > 0
					? Math.min(1, startVisibleHeight / height)
					: 1;
			entryFraction = surfaceFraction = startRatio + 0.08;
		},
		render(ctx, state) {
			const {
				width: w,
				height: h,
				phase,
				phaseProgress: p,
				elapsedSec: time,
				isDark,
			} = state;
			if (!w || !h) return;
			const ink = materials[Number(isDark)];
			const targetH =
				state.targetVisibleHeight && state.targetVisibleHeight > 0
					? Math.min(h, state.targetVisibleHeight)
					: h;
			const exitRatio = h > 0 ? targetH / h : 1;
			const cx = w / 2;
			const cy = targetH / 2;
			const wave = phase === "entering" || phase === "exiting";
			const amp = phase === "exiting" ? 15 * (1 - 0.4 * p) : 15;
			const margin = Math.max(24 / h, 0.08);
			if (phase === "entering" && lastPhase === "exiting")
				entryFraction = surfaceFraction;
			if (phase === "entering")
				surfaceFraction = -margin + (entryFraction + margin) * (1 - p) ** 2.4;
			else if (phase === "exiting")
				surfaceFraction = -margin + (exitRatio + 2 * margin) * p ** 1.3;
			else surfaceFraction = -margin;
			lastPhase = phase;
			ctx.clearRect(0, 0, w, h);
			ctx.save();
			if (wave) {
				traceSurface(ctx, w, h * surfaceFraction, amp, time);
				ctx.lineTo(w, h);
				ctx.lineTo(0, h);
				ctx.closePath();
				ctx.clip();
			}
			ctx.drawImage(ink.base, 0, 0, w, h);
			drawGlow(
				ctx,
				ink.glows[0],
				w * (0.28 + 0.1 * Math.sin(time * 1.4)),
				h * (0.34 + 0.12 * Math.cos(time * 1.1)),
				Math.max(w * 0.48, h * 0.4),
			);
			drawGlow(
				ctx,
				ink.glows[1],
				w * (0.72 + 0.08 * Math.cos(time * 1.2)),
				h * (0.64 - 0.1 * Math.sin(time * 1.3)),
				Math.max(w * 0.44, h * 0.38),
			);
			drawGlow(
				ctx,
				ink.glows[2],
				cx,
				h * (0.5 - state.scrollNorm * 0.14),
				Math.max(w * 0.34, h * 0.28),
			);
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(-0.21);
			ctx.drawImage(ink.beam, -w, -82, w * 2, 164);
			ctx.restore();

			const held = phase === "holding";
			const falling = phase === "exiting";
			const speed = falling
				? 150 + 500 * p
				: phase === "entering"
					? -310
					: -(
							78 +
							130 * state.scrollNorm +
							Math.min(100, state.scrollVelocity * 0.035)
						);
			const shimmer = held ? 0.91 + 0.09 * Math.sin(time * circle * 6.5) : 1;
			for (const drop of drops) {
				const velocity = held ? 0 : speed * drop.speed;
				drop.y += (velocity * state.dt) / h;
				if (drop.y < -24 / h) drop.y = 1 + 14 / h;
				const x = drop.x * w;
				const y =
					drop.y * h + (held ? 0.35 * Math.sin(time * 36 + drop.offset) : 0);
				const r = drop.radius;
				const color = rainColors[drop.color];
				ctx.globalAlpha = 0.78 * shimmer;
				if (!held) {
					const length = Math.max(8, Math.min(22, Math.abs(velocity) / 15));
					ctx.save();
					ctx.translate(x, y);
					if (falling) ctx.scale(1, -1);
					ctx.drawImage(tails[drop.color], -r * 0.42, 0, r * 0.84, length);
					ctx.restore();
				}
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(x, y, r, 0, circle);
				ctx.fill();
				ctx.fillStyle = "#fff";
				ctx.beginPath();
				ctx.arc(x - r * 0.22, y - r * 0.26, r * 0.42, 0, circle);
				ctx.fill();
				if (held && r > 3.2) {
					ctx.globalAlpha = 0.34 * shimmer;
					ctx.strokeStyle = color;
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.arc(x, y, r * 2.25, 0, circle);
					ctx.stroke();
				}
			}
			// 主栏居中与整站视口中心存在偏置，且各页高度不一导致纵向重心不稳，本版本暂不绘制中央文字印记（保留 state.imprint 契约以便后续复用）
			ctx.globalAlpha = 1;
			ctx.restore();
			if (wave) {
				ctx.save();
				traceSurface(ctx, w, h * surfaceFraction, amp, time);
				ctx.strokeStyle = isDark
					? "rgba(182,248,255,.92)"
					: "rgba(92,198,218,.85)";
				ctx.lineWidth = 3;
				ctx.shadowColor = "#8eeeff";
				ctx.shadowBlur = 12;
				ctx.stroke();
				ctx.restore();
			}
		},
		dispose() {
			drops = [];
			tails = [];
			materials = [];
		},
	};
}
