import { createRainTextures, type RainTextures } from "./liquid-rain-textures";

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

export function createRainTextureCache(): (
	hue: number,
) => RainTextures<HTMLCanvasElement> {
	let cached: RainTextures<HTMLCanvasElement> | undefined;
	let cachedHue: number | undefined;

	return (hue) => {
		if (cached && cachedHue === hue) return cached;
		cached = createRainTextures(hue, canvasTexture, (ctx) => ctx.canvas);
		cachedHue = hue;
		return cached;
	};
}
