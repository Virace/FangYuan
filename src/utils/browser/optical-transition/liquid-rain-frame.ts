import { type RainTextures, rainColors } from "./liquid-rain-textures";
import type { TransitionClock, TransitionFrameState } from "./types";

export interface RainDrop {
	x: number;
	y: number;
	radius: number;
	speed: number;
	offset: number;
	color: number;
}

export interface RainSnapshot {
	state: TransitionFrameState;
	clock: TransitionClock;
	viewportHeight: number;
	entryFraction: number;
	drops: RainDrop[];
}

export type RainWorkerMessage =
	| { type: "warm"; hue: number }
	| {
			type: "start";
			canvas: OffscreenCanvas;
			hue: number;
			snapshot: RainSnapshot;
	  }
	| { type: "update"; parameters: Omit<RainSnapshot, "drops"> }
	| { type: "stop" };

type DrawingContext =
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D;
const circle = Math.PI * 2;

function sampleRain(
	snapshot: RainSnapshot,
	time: number,
): {
	p: number;
	surface: number;
	speed: number;
	distance: number;
} {
	const { state, clock, entryFraction } = snapshot;
	const { height, phase } = state;
	const progressAt = (seconds: number) =>
		Math.max(
			0,
			Math.min(1, (seconds * 1000 - clock.phaseStart) / clock.duration),
		);
	const p = progressAt(time);
	const margin = Math.max(24 / Math.max(height, 1), 0.08);
	const exitRatio =
		Math.min(height, state.targetVisibleHeight || height) / Math.max(height, 1);
	let surface = -margin;
	let speed = 0;
	let meanSpeed = 0;
	if (phase === "entering") {
		surface += (entryFraction + margin) * (1 - p) ** 2.4;
		speed = meanSpeed = -310;
	} else if (phase === "exiting") {
		surface += (exitRatio + 2 * margin) * p ** 1.3;
		speed = 150 + 500 * p;
		meanSpeed = 150 + 250 * (p + progressAt(state.elapsedSec));
	} else if (phase === "rolling") {
		speed = meanSpeed = -(
			78 +
			130 * state.scrollNorm +
			Math.min(100, state.scrollVelocity * 0.035)
		);
	}
	const distance =
		(meanSpeed * Math.max(0, time - state.elapsedSec)) / Math.max(height, 1);
	return { p, surface, speed, distance };
}

function dropPosition(
	drop: RainDrop,
	distance: number,
	height: number,
): number {
	const y = drop.y + drop.speed * distance;
	const top = -24 / Math.max(height, 1);
	if (y >= top) return y;
	const span = 1 + 14 / Math.max(height, 1) - top;
	return top + ((((y - top) % span) + span) % span);
}

export function advanceRainDrops(
	snapshot: RainSnapshot,
	elapsedSec: number,
): number {
	const pose = sampleRain(snapshot, elapsedSec);
	for (const drop of snapshot.drops) {
		drop.y = dropPosition(drop, pose.distance, snapshot.state.height);
	}
	return pose.surface;
}

export function drawRain(
	ctx: DrawingContext,
	background: DrawingContext,
	textures: RainTextures<CanvasImageSource>,
	snapshot: RainSnapshot,
	time: number,
): void {
	const { state } = snapshot;
	const { width: w, height: h, isDark, phase } = state;
	if (!w || !h) return;
	const { p, surface, speed, distance } = sampleRain(snapshot, time);
	const ink = textures.materials[Number(isDark)];
	const targetH = Math.min(h, state.targetVisibleHeight || h);
	const falling = phase === "exiting";
	const held = phase === "holding";
	const wave = falling || phase === "entering";
	let edge: Path2D | undefined;
	ctx.clearRect(0, 0, w, snapshot.viewportHeight);
	ctx.save();
	if (wave) {
		const amp = falling ? 15 * (1 - 0.4 * p) : 15;
		edge = new Path2D();
		for (let x = 0; ; x = Math.min(w, x + 10)) {
			const y =
				h * surface +
				(Math.sin(x * 0.02 + time * 4.4) +
					0.45 * Math.cos(x * 0.046 - time * 2.9)) *
					amp;
			if (x === 0) edge.moveTo(x, y);
			else edge.lineTo(x, y);
			if (x === w) break;
		}
		const clip = new Path2D(edge);
		clip.lineTo(w, h);
		clip.lineTo(0, h);
		clip.closePath();
		ctx.clip(clip);
	}
	const bg = background;
	bg.setTransform(bg.canvas.width / w, 0, 0, bg.canvas.height / h, 0, 0);
	bg.drawImage(ink.base, 0, 0, w, h);
	function glow(index: number, x: number, y: number, radius: number) {
		bg.drawImage(
			ink.glows[index],
			x - radius,
			y - radius,
			radius * 2,
			radius * 2,
		);
	}
	glow(
		0,
		w * (0.28 + 0.1 * Math.sin(time * 1.4)),
		h * (0.34 + 0.12 * Math.cos(time * 1.1)),
		Math.max(w * 0.48, h * 0.4),
	);
	glow(
		1,
		w * (0.72 + 0.08 * Math.cos(time * 1.2)),
		h * (0.64 - 0.1 * Math.sin(time * 1.3)),
		Math.max(w * 0.44, h * 0.38),
	);
	glow(
		2,
		w * 0.5,
		h * (0.5 - state.scrollNorm * 0.14),
		Math.max(w * 0.34, h * 0.28),
	);
	bg.save();
	bg.translate(w * 0.5, targetH * 0.5);
	bg.rotate(-0.21);
	bg.drawImage(ink.beam, -w, -82, w * 2, 164);
	bg.restore();
	ctx.drawImage(bg.canvas, 0, 0, w, h);
	const shimmer = held ? 0.91 + 0.09 * Math.sin(time * circle * 6.5) : 1;
	const tails = falling ? textures.tailsDown : textures.tails;
	for (const drop of snapshot.drops) {
		const x = drop.x * w;
		const y =
			dropPosition(drop, distance, h) * h +
			(held ? 0.35 * Math.sin(time * 36 + drop.offset) : 0);
		const r = drop.radius;
		const color = rainColors[drop.color];
		ctx.globalAlpha = 0.78 * shimmer;
		if (!held) {
			const length = Math.max(
				8,
				Math.min(22, Math.abs(speed * drop.speed) / 15),
			);
			ctx.drawImage(
				tails[drop.color],
				x - r * 0.42,
				falling ? y - length : y,
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
	ctx.restore();
	if (edge) {
		ctx.save();
		ctx.strokeStyle = "rgba(142,238,255,.22)";
		ctx.lineWidth = 8;
		ctx.stroke(edge);
		ctx.strokeStyle = isDark ? "rgba(182,248,255,.92)" : "rgba(92,198,218,.85)";
		ctx.lineWidth = 3;
		ctx.stroke(edge);
		ctx.restore();
	}
}
