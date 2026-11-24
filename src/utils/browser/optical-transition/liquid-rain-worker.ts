import {
	createRainTextures,
	type RainTextureMessage,
} from "./liquid-rain-textures";

self.onmessage = ({ data: hue }: MessageEvent<number>) => {
	const bitmaps: ImageBitmap[] = [];
	const textures = createRainTextures(
		hue,
		(width, height) => {
			const ctx = new OffscreenCanvas(width, height).getContext("2d");
			if (!ctx) throw new Error("OffscreenCanvas 2D unavailable");
			return ctx;
		},
		(ctx) => {
			const bitmap = ctx.canvas.transferToImageBitmap();
			bitmaps.push(bitmap);
			return bitmap;
		},
	);
	const result: RainTextureMessage = { textures, bitmaps };
	self.postMessage(result, { transfer: bitmaps });
};
