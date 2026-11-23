import sharp from "sharp";
import type { OpticalPrismConfig } from "../types/config";
import {
	resolveConfigAssetUrl,
	resolveExternalAssetFile,
} from "./image-source";

export const prismSize = 248;
const samples = 360;
const pixels = prismSize * 2;
const profiles = new Map<string, Promise<number[]>>();
const backEdges = new Map<string, Promise<string>>();

function readAlpha(file: string) {
	return sharp(file)
		.resize(pixels, pixels, { fit: "contain", background: "#0000" })
		.ensureAlpha()
		.extractChannel("alpha")
		.raw()
		.toBuffer();
}

async function readProfile(file: string): Promise<number[]> {
	const alpha = await readAlpha(file);
	const center = pixels / 2;
	if (alpha[center * pixels + center] < 128) {
		throw new Error(`棱镜素材的中心需要位于实体内：${file}`);
	}

	// 从光轴追到首个透明像素，独立装饰和半透明外发光不作为出光面。
	return Array.from({ length: samples }, (_, index) => {
		const angle = index * ((2 * Math.PI) / samples);
		const dx = Math.cos(angle);
		const dy = Math.sin(angle);
		let distance = 0;
		for (; ; distance++) {
			const x = Math.floor(center + dx * distance);
			const y = Math.floor(center + dy * distance);
			if (
				x < 0 ||
				y < 0 ||
				x >= pixels ||
				y >= pixels ||
				alpha[y * pixels + x] < 128
			)
				break;
		}
		return distance / 2;
	});
}

async function renderBackEdge(file: string): Promise<string> {
	const alpha = await readAlpha(file);
	const raw = { width: pixels, height: pixels, channels: 1 as const };
	const inside = await sharp(alpha, { raw })
		.dilate(5)
		.greyscale()
		.raw()
		.toBuffer();
	const edge = Buffer.alloc(alpha.length * 2, 255);
	for (let i = 0; i < alpha.length; i++)
		edge[i * 2 + 1] = Math.max(0, alpha[i] - inside[i]);
	const mask = await sharp(edge, { raw: { ...raw, channels: 2 } })
		.webp({ lossless: true })
		.toBuffer();
	return `data:image/webp;base64,${mask.toString("base64")}`;
}

function loadPrismAsset<T>(
	reference: string,
	cache: Map<string, Promise<T>>,
	read: (file: string) => Promise<T>,
): Promise<T> {
	const file = resolveExternalAssetFile(reference);
	if (import.meta.env.DEV) return read(file);
	const cached = cache.get(file);
	if (cached) return cached;
	const asset = read(file);
	cache.set(file, asset);
	return asset;
}

export interface ResolvedOpticalPrism {
	src: string;
	profile: number[];
	back?: string;
	backEdge?: string;
	spacer?: string;
	guides?: [number, number][][];
	crown?: "diamond";
}

export async function resolveOpticalPrism(
	config?: OpticalPrismConfig,
): Promise<ResolvedOpticalPrism | undefined> {
	if (!config) return undefined;
	const { face, back, spacer, guides, crown } =
		typeof config === "string" ? { face: config } : config;
	const [src, backSrc, spacerSrc, profile, backEdge] = await Promise.all([
		resolveConfigAssetUrl(face, "site"),
		resolveConfigAssetUrl(back, "site"),
		resolveConfigAssetUrl(spacer, "site"),
		loadPrismAsset(face, profiles, readProfile),
		back?.startsWith("assets/")
			? loadPrismAsset(back, backEdges, renderBackEdge)
			: undefined,
	]);
	if (!src) return undefined;
	return {
		src,
		profile,
		back: backSrc,
		backEdge,
		spacer: spacerSrc,
		guides,
		crown,
	};
}
