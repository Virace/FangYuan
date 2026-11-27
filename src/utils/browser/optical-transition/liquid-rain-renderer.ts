import { createRainTextureCache } from "./liquid-rain-texture-cache";
import { type RainTextures, rainColors } from "./liquid-rain-textures";
import type {
	OpticalTransitionHoldHost,
	OpticalTransitionRenderer,
	TransitionFrameState,
} from "./types";

const circle = Math.PI * 2;
const sineEasing = "cubic-bezier(0.3642,0,0.6358,1)";

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

function drawGlow(
	ctx: CanvasRenderingContext2D,
	image: CanvasImageSource,
	x: number,
	y: number,
	radius: number,
) {
	ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
}

interface Drop {
	x: number;
	y: number;
	radius: number;
	speed: number;
	offset: number;
	color: number;
}

function oscillate(
	element: HTMLElement,
	keyframes: Keyframe[],
	frequency: number,
	elapsedSec: number,
	phase = 0,
) {
	return element.animate(keyframes, {
		duration: (Math.PI * 1000) / frequency,
		delay: -(elapsedSec + (phase + Math.PI / 2) / frequency) * 1000,
		direction: "alternate",
		iterations: Number.POSITIVE_INFINITY,
		easing: sineEasing,
	});
}

function placeTexture(
	canvas: HTMLCanvasElement,
	x: number,
	y: number,
	width: number,
	height: number,
) {
	canvas.style.left = `${x}px`;
	canvas.style.top = `${y}px`;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
}

export function createLiquidRainRenderer(): OpticalTransitionRenderer {
	let drops: Drop[] = [];
	const texturesForHue = createRainTextureCache();
	let materials: RainTextures<HTMLCanvasElement>["materials"] = [];
	let tails: RainTextures["tails"] = [];
	let tailsDown: RainTextures["tailsDown"] = [];
	let lastPhase: TransitionFrameState["phase"] | undefined;
	let surfaceFraction = 1;
	let entryFraction = 1;
	let background: HTMLCanvasElement | undefined;
	let glowLayer: CanvasRenderingContext2D | null = null;
	let holdHost: OpticalTransitionHoldHost | undefined;
	let holdAnimations: Animation[] = [];

	function drawDrops(
		ctx: CanvasRenderingContext2D,
		state: TransitionFrameState,
		held: boolean,
		falling: boolean,
		speed: number,
	) {
		const { width: w, height: h, elapsedSec: time } = state;
		const shimmer = held ? 0.91 + 0.09 * Math.sin(time * circle * 6.5) : 1;
		const activeTails = falling ? tailsDown : tails;
		for (const drop of drops) {
			if (!held) {
				const velocity = speed * drop.speed;
				drop.y += (velocity * state.dt) / h;
				if (drop.y < -24 / h) drop.y = 1 + 14 / h;
			}
			const x = drop.x * w;
			const y =
				drop.y * h + (held ? 0.35 * Math.sin(time * 36 + drop.offset) : 0);
			const r = drop.radius;
			const color = rainColors[drop.color];
			ctx.globalAlpha = 0.78 * shimmer;
			if (!held) {
				const velocity = speed * drop.speed;
				const length = Math.max(8, Math.min(22, Math.abs(velocity) / 15));
				const tailY = falling ? y - length : y;
				ctx.drawImage(
					activeTails[drop.color],
					x - r * 0.42,
					tailY,
					r * 0.84,
					length,
				);
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
		ctx.globalAlpha = 1;
	}

	function cancelHoldAnimations() {
		for (const anim of holdAnimations) anim.cancel();
		holdAnimations = [];
		if (holdHost) {
			holdHost.holdLayer.hidden = true;
			holdHost.holdLayer.replaceChildren();
			holdHost = undefined;
		}
	}

	return {
		id: "liquid-rain",
		prepare({ width, height, startVisibleHeight }) {
			cancelHoldAnimations();
			const styles = getComputedStyle(document.body);
			const hue = Number.parseFloat(styles.getPropertyValue("--hue")) || 0;
			({ materials, tails, tailsDown } = texturesForHue(hue));
			if (!background) {
				background = document.createElement("canvas");
				background.width = 256;
				background.height = 192;
				glowLayer = background.getContext("2d", { alpha: false });
			}
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
			const glow = glowLayer ?? ctx;
			if (glowLayer && background) {
				glowLayer.setTransform(
					background.width / w,
					0,
					0,
					background.height / h,
					0,
					0,
				);
			}
			glow.drawImage(ink.base, 0, 0, w, h);
			drawGlow(
				glow,
				ink.glows[0],
				w * (0.28 + 0.1 * Math.sin(time * 1.4)),
				h * (0.34 + 0.12 * Math.cos(time * 1.1)),
				Math.max(w * 0.48, h * 0.4),
			);
			drawGlow(
				glow,
				ink.glows[1],
				w * (0.72 + 0.08 * Math.cos(time * 1.2)),
				h * (0.64 - 0.1 * Math.sin(time * 1.3)),
				Math.max(w * 0.44, h * 0.38),
			);
			drawGlow(
				glow,
				ink.glows[2],
				cx,
				h * (0.5 - state.scrollNorm * 0.14),
				Math.max(w * 0.34, h * 0.28),
			);
			if (glowLayer && background) ctx.drawImage(background, 0, 0, w, h);
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
			drawDrops(ctx, state, held, falling, speed);
			// 主栏居中与整站视口中心存在偏置，且各页高度不一导致纵向重心不稳，本版本暂不绘制中央文字印记（保留 state.imprint 契约以便后续复用）
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
		enterHold(host, state) {
			const { width: w, height: h, elapsedSec: time, isDark } = state;
			if (!w || !h || !materials.length) return false;
			cancelHoldAnimations();
			const ink = materials[Number(isDark)];
			const targetH = Math.min(h, state.targetVisibleHeight || h);
			const radii = [
				Math.max(w * 0.48, h * 0.4),
				Math.max(w * 0.44, h * 0.38),
				Math.max(w * 0.34, h * 0.28),
			];
			const centers = [
				[w * 0.28, h * 0.34],
				[w * 0.72, h * 0.64],
				[w * 0.5, h * 0.5],
			];
			for (const [i, glow] of ink.glows.entries()) {
				const radius = radii[i];
				placeTexture(
					glow,
					centers[i][0] - radius,
					centers[i][1] - radius,
					radius * 2,
					radius * 2,
				);
			}
			placeTexture(ink.beam, -w * 0.5, targetH * 0.5 - 82, w * 2, 164);
			ink.beam.style.transform = "rotate(-0.21rad)";

			const rain = document.createElement("div");
			rain.className = "optical-transition-drops";
			for (const drop of drops) {
				const bead = document.createElement("span");
				bead.style.left = `${drop.x * 100}%`;
				bead.style.top = `${drop.y * 100}%`;
				bead.style.color = rainColors[drop.color];
				bead.style.setProperty("--drop-radius", `${drop.radius}px`);
				bead.style.animationDelay = `${-(time + (drop.offset + Math.PI / 2) / 36)}s`;
				if (drop.radius > 3.2) bead.className = "optical-transition-ring";
				rain.append(bead);
			}

			holdHost = host;
			surfaceFraction = -Math.max(24 / h, 0.08);
			lastPhase = "holding";
			host.holdLayer.replaceChildren(ink.base, ...ink.glows, ink.beam, rain);
			host.holdLayer.hidden = false;
			// 光斑两轴的频率不同，分别合成才能在慢请求期间沿原轨迹继续移动。
			function drift(
				glow: HTMLCanvasElement,
				axis: "x" | "y",
				amount: number,
				frequency: number,
				phase = 0,
			) {
				const keyframes =
					axis === "x"
						? [{ translate: `${-amount}px 0` }, { translate: `${amount}px 0` }]
						: [
								{ transform: `translateY(${-amount}px)` },
								{ transform: `translateY(${amount}px)` },
							];
				holdAnimations.push(oscillate(glow, keyframes, frequency, time, phase));
			}
			drift(ink.glows[0], "x", w * 0.1, 1.4);
			drift(ink.glows[0], "y", h * 0.12, 1.1, Math.PI / 2);
			drift(ink.glows[1], "x", w * 0.08, 1.2, Math.PI / 2);
			drift(ink.glows[1], "y", h * 0.1, 1.3, Math.PI);
			holdAnimations.push(
				oscillate(
					rain,
					[{ opacity: 0.82 }, { opacity: 1 }],
					circle * 6.5,
					time,
				),
			);
			host.ctx.clearRect(0, 0, w, h);
			return true;
		},
		leaveHold() {
			cancelHoldAnimations();
		},
		dispose() {
			cancelHoldAnimations();
			drops = [];
			tails = [];
			tailsDown = [];
			materials = [];
		},
	};
}
