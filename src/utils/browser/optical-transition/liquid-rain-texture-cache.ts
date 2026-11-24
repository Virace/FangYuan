import {
	createRainTextures,
	type RainTextureMessage,
	type RainTextures,
} from "./liquid-rain-textures";

function canvasTexture(
	width: number,
	height: number,
): CanvasRenderingContext2D {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D unavailable");
	return ctx;
}

export function createRainTextureCache(): (hue: number) => RainTextures {
	let cached: RainTextures | undefined;
	let cachedHue: number | undefined;
	let bitmaps: ImageBitmap[] = [];
	let worker: Worker | undefined;

	function stopWorker() {
		if (!worker) return;
		worker.onmessage = null;
		worker.terminate();
		worker = undefined;
	}

	function warm() {
		if (cached || matchMedia("(prefers-reduced-motion: reduce)").matches)
			return;
		const hue =
			Number.parseFloat(
				getComputedStyle(document.body).getPropertyValue("--hue"),
			) || 0;
		try {
			worker = new Worker(new URL("./liquid-rain-worker.ts", import.meta.url), {
				type: "module",
			});
			worker.onmessage = ({ data }: MessageEvent<RainTextureMessage>) => {
				cached = data.textures;
				cachedHue = hue;
				bitmaps = data.bitmaps;
				stopWorker();
			};
			worker.onerror = (event) => {
				event.preventDefault();
				stopWorker();
			};
			worker.postMessage(hue);
		} catch {
			stopWorker();
		}
	}

	if (typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined") {
		const schedule = () => {
			if (typeof requestIdleCallback === "function") requestIdleCallback(warm);
			else setTimeout(warm, 0);
		};
		if (document.readyState === "complete") schedule();
		else window.addEventListener("load", schedule, { once: true });
	}

	return (hue) => {
		if (cached && cachedHue === hue) return cached;
		stopWorker();
		const next = createRainTextures(hue, canvasTexture, (ctx) => ctx.canvas);
		for (const bitmap of bitmaps) bitmap.close();
		bitmaps = [];
		cached = next;
		cachedHue = hue;
		return cached;
	};
}
