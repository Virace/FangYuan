import {
	advanceRainDrops,
	drawRain,
	type RainDrop,
	type RainSnapshot,
	type RainWorkerMessage,
} from "./liquid-rain-frame";
import { createRainTextureCache } from "./liquid-rain-texture-cache";
import { type RainTextures, rainColors } from "./liquid-rain-textures";
import type {
	OpticalTransitionHoldHost,
	OpticalTransitionRenderer,
	TransitionClock,
	TransitionFrameState,
} from "./types";

const circle = Math.PI * 2;
const sineEasing = "cubic-bezier(0.3642,0,0.6358,1)";

function themeHue() {
	return (
		Number.parseFloat(
			getComputedStyle(document.body).getPropertyValue("--hue"),
		) || 0
	);
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
	const texturesForHue = createRainTextureCache();
	let textures: RainTextures<HTMLCanvasElement> | undefined;
	let background: CanvasRenderingContext2D | null = null;
	let hue = 0;
	let drops: RainDrop[] = [];
	let entryFraction = 1;
	let clock: TransitionClock | undefined;
	let snapshot: RainSnapshot | undefined;
	let holdHost: OpticalTransitionHoldHost | undefined;
	let holdAnimations: Animation[] = [];
	let worker: Worker | undefined;
	let workerReady = false;
	let activeWorker = false;
	let selectBackend = false;
	let workerInitialized = false;

	function disableWorker() {
		worker?.terminate();
		worker = undefined;
		workerReady = false;
		activeWorker = false;
	}
	function initializeWorker() {
		if (workerInitialized) return;
		workerInitialized = true;
		if (
			typeof Worker === "undefined" ||
			typeof HTMLCanvasElement.prototype.transferControlToOffscreen !==
				"function"
		)
			return;
		try {
			worker = new Worker(new URL("./liquid-rain-worker.ts", import.meta.url), {
				type: "module",
			});
			worker.onmessage = (event: MessageEvent<unknown>) => {
				workerReady = event.data === "ready";
			};
			worker.onerror = disableWorker;
			worker.postMessage({
				type: "warm",
				hue: themeHue(),
			} satisfies RainWorkerMessage);
		} catch {
			disableWorker();
		}
	}
	if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
		initializeWorker();

	function updateSnapshot(
		state: TransitionFrameState,
		nextClock: TransitionClock,
	) {
		const previous = snapshot;
		if (
			previous &&
			previous.clock.phaseStart === nextClock.phaseStart &&
			previous.clock.duration === nextClock.duration &&
			previous.state.phase === state.phase &&
			previous.state.width === state.width &&
			previous.state.height === state.height &&
			previous.state.dpr === state.dpr &&
			previous.state.isDark === state.isDark &&
			previous.state.targetVisibleHeight === state.targetVisibleHeight &&
			previous.state.scrollNorm === state.scrollNorm &&
			previous.state.scrollVelocity === state.scrollVelocity &&
			previous.viewportHeight === innerHeight
		)
			return;
		if (previous) {
			const surface = advanceRainDrops(previous, state.elapsedSec);
			if (state.phase === "entering" && previous.state.phase === "exiting")
				entryFraction = surface;
		}
		const parameters = {
			state: { ...state },
			clock: nextClock,
			viewportHeight: innerHeight,
			entryFraction,
		};
		snapshot = { ...parameters, drops };
		if (activeWorker)
			worker?.postMessage({
				type: "update",
				parameters,
			} satisfies RainWorkerMessage);
	}

	function cancelHoldAnimations() {
		for (const anim of holdAnimations) anim.cancel();
		holdAnimations = [];
		if (holdHost) {
			holdHost.canvas.style.visibility = "";
			holdHost.holdLayer.hidden = true;
			holdHost.holdLayer.replaceChildren();
			holdHost = undefined;
		}
	}

	return {
		id: "liquid-rain",
		prepare({ width, height, startVisibleHeight }) {
			initializeWorker();
			cancelHoldAnimations();
			hue = themeHue();
			textures = texturesForHue(hue);
			selectBackend = true;
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
			const startRatio =
				startVisibleHeight && height > 0
					? Math.min(1, startVisibleHeight / height)
					: 1;
			entryFraction = startRatio + 0.08;
		},
		renderOffscreen(canvas, state, nextClock) {
			if (!activeWorker && !(selectBackend && workerReady)) {
				selectBackend = false;
				return false;
			}
			clock = nextClock;
			updateSnapshot(state, nextClock);
			if (selectBackend) {
				selectBackend = false;
				if (worker && workerReady && snapshot) {
					try {
						const offscreen = canvas.transferControlToOffscreen();
						worker.postMessage(
							{
								type: "start",
								canvas: offscreen,
								hue,
								snapshot,
							} satisfies RainWorkerMessage,
							[offscreen],
						);
						activeWorker = true;
					} catch {
						disableWorker();
					}
				}
			}
			return activeWorker;
		},
		render(ctx, state, nextClock) {
			clock = nextClock ?? {
				origin: 0,
				phaseStart: (state.elapsedSec - state.phaseProgress) * 1000,
				duration: 1000,
			};
			updateSnapshot(state, clock);
			if (!snapshot || !textures) return;
			if (!background) {
				const layer = document.createElement("canvas");
				layer.width = 256;
				layer.height = 192;
				background = layer.getContext("2d", { alpha: false });
			}
			if (background)
				drawRain(ctx, background, textures, snapshot, state.elapsedSec);
		},
		enterHold(host, state, holdMs) {
			const { width: w, height: h, isDark, elapsedSec: time } = state;
			if (!w || !h || !textures || !clock) return false;
			cancelHoldAnimations();
			updateSnapshot(state, {
				...clock,
				phaseStart: state.elapsedSec * 1000,
				duration: holdMs,
			});
			const ink = textures.materials[Number(isDark)];
			const targetH = Math.min(h, state.targetVisibleHeight || h);
			const radii = [
				Math.max(w * 0.48, h * 0.4),
				Math.max(w * 0.44, h * 0.38),
				Math.max(w * 0.34, h * 0.28),
			];
			const centers = [
				[w * 0.28, h * 0.34],
				[w * 0.72, h * 0.64],
				[w * 0.5, h * (0.5 - state.scrollNorm * 0.14)],
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

			host.holdLayer.replaceChildren(ink.base, ...ink.glows, ink.beam, rain);
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
			holdHost = host;
			host.canvas.style.visibility = "hidden";
			host.holdLayer.hidden = false;
			return true;
		},
		leaveHold() {
			cancelHoldAnimations();
		},
		dispose() {
			cancelHoldAnimations();
			drops = [];
			if (activeWorker)
				worker?.postMessage({ type: "stop" } satisfies RainWorkerMessage);
			activeWorker = false;
			snapshot = undefined;
			clock = undefined;
			textures = undefined;
		},
	};
}
