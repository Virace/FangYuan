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
	private bannerSync = false;
	private bannerAnim: Animation | undefined;

	get isBannerSynced(): boolean {
		return this.bannerSync;
	}

	constructor() {
		this.host.className = "optical-transition-veil";
		this.host.setAttribute("aria-hidden", "true");
		this.host.append(this.canvas);
		document.body.append(this.host);
	}

	private applyCanvasGeometry(
		width: number,
		height: number,
		startVisibleHeight: number,
		targetVisibleHeight: number,
	): void {
		const dpr = Math.min(devicePixelRatio, 2);
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
		this.geometry.startVisibleHeight = startVisibleHeight;
		this.geometry.targetVisibleHeight = targetVisibleHeight;
	}

	private startBannerSlide(startOffsetY: number, targetOffsetY: number): void {
		this.bannerAnim?.cancel();
		this.bannerAnim = undefined;
		this.host.style.transform = `translate3d(0,${targetOffsetY}px,0)`;
		if (Math.abs(startOffsetY - targetOffsetY) <= 0.5) return;
		this.bannerAnim = this.host.animate(
			[
				{ transform: `translate3d(0,${startOffsetY}px,0)` },
				{ transform: `translate3d(0,${targetOffsetY}px,0)` },
			],
			{
				duration: 700,
				easing: "cubic-bezier(0.4, 0, 0.2, 1)",
				fill: "forwards",
			},
		);
	}

	sync(main: HTMLElement): void {
		if (this.bannerSync) {
			this.geometry.isDark =
				document.documentElement.classList.contains("dark");
			return;
		}
		const rect = main.getBoundingClientRect();
		const top = Math.max(0, rect.top);
		const width = rect.width;
		// 光幕底边始终延伸至视口底部，使大小容器切换时动画只随窗帘起落而不发生高度跳变。
		const height = Math.max(0, innerHeight - top);
		this.host.removeAttribute("data-banner-sync");
		this.host.style.left = "";
		this.host.style.top = "";
		this.host.style.transform = `translate3d(${Math.max(0, rect.left)}px,${top}px,0)`;
		this.host.style.width = `${width}px`;
		this.host.style.height = `${height}px`;
		this.host.toggleAttribute("data-clipped-top", rect.top < 0);
		this.applyCanvasGeometry(width, height, height, height);
	}

	/** 通过 Web Animations API 直接复用与 #main-grid 完全一致的 700ms GPU 缓动曲线。 */
	lockToBanner(
		main: HTMLElement,
		baseTop: number,
		startOffsetY: number,
		targetOffsetY: number,
		startVisibleHeight: number,
		targetVisibleHeight: number,
	): void {
		const rect = main.getBoundingClientRect();
		const top = Math.max(0, baseTop);
		const width = rect.width;
		const height = Math.max(0, innerHeight - top);
		this.host.style.left = `${Math.max(0, rect.left)}px`;
		this.host.style.top = `${top}px`;
		this.host.style.width = `${width}px`;
		this.host.style.height = `${height}px`;
		this.host.setAttribute("data-banner-sync", "");
		this.host.toggleAttribute("data-clipped-top", baseTop < 0);
		this.applyCanvasGeometry(
			width,
			height,
			startVisibleHeight,
			targetVisibleHeight,
		);
		this.startBannerSlide(startOffsetY, targetOffsetY);
		this.bannerSync = true;
	}

	retargetBanner(targetOffsetY: number, targetVisibleHeight: number): void {
		const currentY = new DOMMatrixReadOnly(
			getComputedStyle(this.host).transform,
		).m42;
		this.startBannerSlide(currentY, targetOffsetY);
		this.geometry.targetVisibleHeight = targetVisibleHeight;
	}

	remove(): void {
		this.bannerAnim?.cancel();
		this.bannerAnim = undefined;
		this.host.remove();
	}
}
