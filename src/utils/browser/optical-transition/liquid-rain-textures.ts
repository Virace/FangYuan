export const rainColors: readonly string[] = [
	"#7ee5f4",
	"#fff5dc",
	"#cfa9ff",
	"#f6b5c8",
];

type TextureContext =
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D;

export interface RainTextures<T = HTMLCanvasElement | ImageBitmap> {
	materials: { base: T; glows: T[]; beam: T; underline: T }[];
	tails: T[];
	tailsDown: T[];
}

export interface RainTextureMessage {
	textures: RainTextures<ImageBitmap>;
	bitmaps: ImageBitmap[];
}

export function createRainTextures<C extends TextureContext, T>(
	hue: number,
	texture: (width: number, height: number) => C,
	finish: (ctx: C) => T,
): RainTextures<T> {
	function material(dark: boolean) {
		const base = texture(384, 256);
		const gradient = base.createLinearGradient(0, 0, 384, 256);
		gradient.addColorStop(0, dark ? "#121a28" : "#e9f0f4");
		gradient.addColorStop(0.5, dark ? "#191829" : "#f3eff6");
		gradient.addColorStop(1, dark ? "#1f1826" : "#ece6ee");
		base.fillStyle = gradient;
		base.fillRect(0, 0, 384, 256);
		base.fillStyle = `oklch(${dark ? 0.23 : 0.95} 0.025 ${hue} / 18%)`;
		base.fillRect(0, 0, 384, 256);

		const glows = (
			dark
				? [
						["74 205 224", 0.24],
						["186 128 238", 0.22],
						["255 236 196", 0.14],
					]
				: [
						["92 190 206", 0.34],
						["218 162 196", 0.32],
						["255 244 218", 0.56],
					]
		).map(([rgb, opacity]) => {
			const glow = texture(192, 192);
			const bloom = glow.createRadialGradient(96, 96, 0, 96, 96, 96);
			bloom.addColorStop(0, `rgb(${rgb} / ${opacity})`);
			bloom.addColorStop(1, `rgb(${rgb} / 0)`);
			glow.fillStyle = bloom;
			glow.fillRect(0, 0, 192, 192);
			return finish(glow);
		});
		const beam = texture(1, 160);
		const prism = beam.createLinearGradient(0, 0, 0, 160);
		prism.addColorStop(0, "rgba(120,224,242,0)");
		prism.addColorStop(
			0.35,
			dark ? "rgba(120,224,242,.16)" : "rgba(120,214,230,.22)",
		);
		prism.addColorStop(
			0.5,
			dark ? "rgba(255,248,232,.18)" : "rgba(255,252,242,.55)",
		);
		prism.addColorStop(
			0.68,
			dark ? "rgba(202,150,248,.16)" : "rgba(210,166,238,.24)",
		);
		prism.addColorStop(1, "rgba(210,166,238,0)");
		beam.fillStyle = prism;
		beam.fillRect(0, 0, 1, 160);
		const underline = texture(136, 2);
		const spectrum = underline.createLinearGradient(0, 0, 136, 0);
		spectrum.addColorStop(0, "#78e0f200");
		spectrum.addColorStop(0.45, dark ? "#a5f0ff" : "#509cb2");
		spectrum.addColorStop(0.75, "#cfa9ff");
		spectrum.addColorStop(1, "#cfa9ff00");
		underline.fillStyle = spectrum;
		underline.fillRect(0, 0, 136, 2);
		return {
			base: finish(base),
			glows,
			beam: finish(beam),
			underline: finish(underline),
		};
	}

	const tails = rainColors.map((color) => {
		const tail = texture(3, 32);
		const fade = tail.createLinearGradient(0, 0, 0, 32);
		fade.addColorStop(0, color);
		fade.addColorStop(1, `${color}00`);
		tail.fillStyle = fade;
		tail.fillRect(0, 0, 3, 32);
		return finish(tail);
	});
	const tailsDown = rainColors.map((color) => {
		const tail = texture(3, 32);
		const fade = tail.createLinearGradient(0, 32, 0, 0);
		fade.addColorStop(0, color);
		fade.addColorStop(1, `${color}00`);
		tail.fillStyle = fade;
		tail.fillRect(0, 0, 3, 32);
		return finish(tail);
	});
	return {
		materials: [material(false), material(true)],
		tails,
		tailsDown,
	};
}
