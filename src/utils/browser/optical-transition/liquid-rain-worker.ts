import {
	advanceRainDrops,
	drawRain,
	type RainSnapshot,
	type RainWorkerMessage,
} from "./liquid-rain-frame";
import { createRainTextures, type RainTextures } from "./liquid-rain-textures";

function context(width: number, height: number) {
	const ctx = new OffscreenCanvas(width, height).getContext("2d");
	if (!ctx) throw new Error("OffscreenCanvas 2D unavailable");
	return ctx;
}

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let snapshot: RainSnapshot | undefined;
let frame = 0;
let cachedHue: number | undefined;
let textures: RainTextures<OffscreenCanvas> | undefined;
const background = context(256, 192);

function prepareTextures(hue: number) {
	if (textures && cachedHue === hue) return;
	textures = createRainTextures(hue, context, (layer) => layer.canvas);
	cachedHue = hue;
}

function draw(now: number) {
	frame = 0;
	if (!ctx || !snapshot || !textures) return;
	const { clock, state, viewportHeight } = snapshot;
	const width = Math.max(1, Math.round(state.width * state.dpr));
	const height = Math.max(1, Math.round(viewportHeight * state.dpr));
	if (ctx.canvas.width !== width) ctx.canvas.width = width;
	if (ctx.canvas.height !== height) ctx.canvas.height = height;
	ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
	const elapsed = (performance.timeOrigin - clock.origin + now) / 1000;
	drawRain(ctx, background, textures, snapshot, elapsed);
	if (
		state.phase === "holding" ||
		(state.phase === "exiting" &&
			elapsed * 1000 >= clock.phaseStart + clock.duration)
	)
		return;
	frame = requestAnimationFrame(draw);
}

self.onmessage = ({ data }: MessageEvent<RainWorkerMessage>) => {
	if (data.type === "warm") {
		prepareTextures(data.hue);
		// 首次 Canvas 绘制可能要初始化 GPU；材质和帧调度都就绪后才接管导航。
		cancelAnimationFrame(requestAnimationFrame(() => {}));
		self.postMessage("ready");
		return;
	}
	if (data.type === "stop") {
		cancelAnimationFrame(frame);
		if (ctx) ctx.canvas.width = ctx.canvas.height = 1;
		ctx = null;
		snapshot = undefined;
		frame = 0;
		return;
	}
	if (data.type === "start") {
		ctx = data.canvas.getContext("2d");
		if (!ctx) throw new Error("OffscreenCanvas 2D unavailable");
		prepareTextures(data.hue);
		snapshot = data.snapshot;
	} else {
		if (!snapshot) return;
		advanceRainDrops(snapshot, data.parameters.state.elapsedSec);
		snapshot = { ...data.parameters, drops: snapshot.drops };
	}
	if (snapshot.state.phase === "holding" || !frame) {
		cancelAnimationFrame(frame);
		draw(performance.now());
	}
};
