export type TransitionPhase = "entering" | "rolling" | "holding" | "exiting";

export interface VeilGeometry {
	width: number;
	height: number;
	dpr: number;
	isDark: boolean;
	startVisibleHeight?: number;
	targetVisibleHeight?: number;
}

export interface TransitionFrameState extends VeilGeometry {
	phase: TransitionPhase;
	phaseProgress: number;
	/** 剩余滚动比例，以及本帧向上滚动的速度（CSS px/s）。 */
	scrollNorm: number;
	scrollVelocity: number;
	elapsedSec: number;
	dt: number;
	imprint: { eyebrow: string; title: string };
}

/** prepare 可采集旧正文。render 只使用帧快照与已按 DPR 缩放的画布；结束或中断后释放资源。 */
export interface OpticalTransitionRenderer {
	readonly id: "liquid-rain" | "color-field";
	prepare(context: {
		mainElement: HTMLElement;
		width: number;
		height: number;
		isDark: boolean;
		startVisibleHeight?: number;
	}): void;
	render(ctx: CanvasRenderingContext2D, state: TransitionFrameState): void;
	dispose(): void;
}
