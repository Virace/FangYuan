import type { VeilGeometry } from "./types";

export class VeilHost {
	readonly canvas: HTMLCanvasElement = document.createElement("canvas");
	readonly ctx: CanvasRenderingContext2D | null = this.canvas.getContext("2d");
	readonly geometry: VeilGeometry = {
		width: 0,
		height: 0,
		dpr: 1,
		isDark: false,
	};
	private host = document.createElement("div");

	constructor() {
		this.host.className = "optical-transition-veil";
		this.host.setAttribute("aria-hidden", "true");
		this.host.append(this.canvas);
		document.body.append(this.host);
	}

	sync(main: HTMLElement): void {
		const rect = main.getBoundingClientRect();
		const top = Math.max(0, rect.top);
		const width = rect.width;
		const height = Math.max(0, innerHeight - top);
		const dpr = Math.min(devicePixelRatio, 2);
		this.host.style.transform = `translate3d(${Math.max(0, rect.left)}px,${top}px,0)`;
		this.host.style.width = `${width}px`;
		this.host.style.height = `${height}px`;
		this.host.toggleAttribute("data-clipped-top", rect.top < 0);
		// 只裁剪宿主的可见部分。顶图伸缩或回顶时避免每帧重新分配整张位图。
		const pixelWidth = Math.max(1, Math.round(width * dpr));
		const pixelHeight = Math.max(1, Math.round(innerHeight * dpr));
		if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
		if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
		this.canvas.style.height = `${innerHeight}px`;
		this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.geometry.width = width;
		this.geometry.height = height;
		this.geometry.dpr = dpr;
		this.geometry.isDark = document.documentElement.classList.contains("dark");
	}

	remove(): void {
		this.host.remove();
	}
}
