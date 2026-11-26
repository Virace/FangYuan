export type RewardAccent = {
	main: string;
	bright: string;
};

export type BeamTarget = {
	eyeEl: HTMLElement;
	frameEl: HTMLElement;
	accent: RewardAccent;
	scanProgress: number;
	intensity: number;
	direction: ScanDirection;
};

export type ScanDirection = "up" | "down";

const WECHAT_ACCENT: RewardAccent = {
	main: "#16a34a",
	bright: "#4ade80",
};

const ALIPAY_ACCENT: RewardAccent = {
	main: "#0284c7",
	bright: "#38bdf8",
};

const FALLBACK_ACCENT: RewardAccent = {
	main: "#0ea5e9",
	bright: "#67e8f9",
};

export function resolveRewardAccent(
	optionId: string,
	optionName: string,
): RewardAccent {
	const key = `${optionId} ${optionName}`.toLowerCase();
	if (
		key.includes("wechat") ||
		key.includes("weixin") ||
		key.includes("微信")
	) {
		return WECHAT_ACCENT;
	}
	if (key.includes("alipay") || key.includes("支付宝")) {
		return ALIPAY_ACCENT;
	}
	return FALLBACK_ACCENT;
}

export function prefersReducedMotion(): boolean {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

export function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

export function easeOutCubic(t: number): number {
	const inv = 1 - clamp01(t);
	return 1 - inv * inv * inv;
}

export function easeOutQuart(t: number): number {
	const inv = 1 - clamp01(t);
	return 1 - inv * inv * inv * inv;
}

/**
 * 3D 打印 / 激光烧结专用推进曲线：首尾轻缓、中段接近匀速，避免前段瞬扫导致肉眼看不到过程。
 */
export function easePrinterSweep(t: number): number {
	const x = clamp01(t);
	const smooth = x * x * (3 - 2 * x);
	return x * 0.72 + smooth * 0.28;
}

function hexToRgba(hex: string, alpha: number): string {
	const parsed = Number.parseInt(hex.slice(1), 16);
	const red = (parsed >> 16) & 255;
	const green = (parsed >> 8) & 255;
	const blue = parsed & 255;
	return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function syncCanvasResolution(
	canvas: HTMLCanvasElement,
	cssWidth: number,
	cssHeight: number,
): { width: number; height: number; dpr: number } {
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
	const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
	if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
		canvas.width = pixelWidth;
		canvas.height = pixelHeight;
	}
	return { width: cssWidth, height: cssHeight, dpr };
}

export function clearCanvas(canvas: HTMLCanvasElement | null): void {
	if (!canvas) {
		return;
	}
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return;
	}
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * 在浮层正上方绘制从按钮光学发射眼射向正在扫描的 `scanY` 接触线的棱镜光束。
 * 光束末端实时跟随打印前沿向上（或向下）推进，形成正面激光投影扫出的立体感。
 */
export function renderProjectionBeams(
	canvas: HTMLCanvasElement,
	targets: readonly BeamTarget[],
	isDark: boolean,
): void {
	const cssWidth = window.innerWidth;
	const cssHeight = window.innerHeight;
	const { dpr } = syncCanvasResolution(canvas, cssWidth, cssHeight);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return;
	}
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, cssWidth, cssHeight);

	if (targets.length === 0) {
		return;
	}

	const coneBaseAlpha = isDark ? 0.24 : 0.18;

	for (const {
		eyeEl,
		frameEl,
		accent,
		scanProgress,
		intensity,
		direction,
	} of targets) {
		if (intensity <= 0.005) {
			continue;
		}

		const eyeRect = eyeEl.getBoundingClientRect();
		const frameRect = frameEl.getBoundingClientRect();
		if (frameRect.width < 8 || eyeRect.width < 1) {
			continue;
		}

		const eyeX = eyeRect.left + eyeRect.width / 2;
		const eyeY = eyeRect.top + eyeRect.height / 2;
		const progress = clamp01(scanProgress);
		const scanY =
			direction === "up"
				? frameRect.bottom - frameRect.height * progress
				: frameRect.top + frameRect.height * progress;

		const targetLeft = frameRect.left + 3;
		const targetRight = frameRect.right - 3;
		const targetMidX = (targetLeft + targetRight) / 2;

		ctx.save();

		// 极薄的正面投影光扇：靠近发射眼与扫描线接触处清晰，中段通透不遮挡已印出的二维码
		const coneGradient = ctx.createLinearGradient(
			eyeX,
			eyeY,
			targetMidX,
			scanY,
		);
		coneGradient.addColorStop(
			0,
			hexToRgba(accent.bright, coneBaseAlpha * 1.55 * intensity),
		);
		coneGradient.addColorStop(
			0.45,
			hexToRgba(accent.main, coneBaseAlpha * 0.48 * intensity),
		);
		coneGradient.addColorStop(
			0.88,
			hexToRgba(accent.bright, coneBaseAlpha * 0.34 * intensity),
		);
		coneGradient.addColorStop(
			1,
			hexToRgba(accent.bright, coneBaseAlpha * 0.92 * intensity),
		);

		ctx.beginPath();
		ctx.moveTo(eyeX - 1.5, eyeY);
		ctx.lineTo(targetLeft, scanY);
		ctx.lineTo(targetRight, scanY);
		ctx.lineTo(eyeX + 1.5, eyeY);
		ctx.closePath();
		ctx.fillStyle = coneGradient;
		ctx.fill();

		// 左右棱镜边缘细光束（渠道亮色 + 淡紫分色）
		ctx.lineWidth = 1.15;
		const leftRay = ctx.createLinearGradient(eyeX, eyeY, targetLeft, scanY);
		leftRay.addColorStop(0, `rgba(255, 255, 255, ${0.82 * intensity})`);
		leftRay.addColorStop(0.5, hexToRgba(accent.bright, 0.56 * intensity));
		leftRay.addColorStop(1, hexToRgba(accent.bright, 0.72 * intensity));
		ctx.strokeStyle = leftRay;
		ctx.beginPath();
		ctx.moveTo(eyeX, eyeY);
		ctx.lineTo(targetLeft, scanY);
		ctx.stroke();

		const rightRay = ctx.createLinearGradient(eyeX, eyeY, targetRight, scanY);
		rightRay.addColorStop(0, `rgba(255, 255, 255, ${0.82 * intensity})`);
		rightRay.addColorStop(0.5, `rgba(167, 139, 250, ${0.5 * intensity})`);
		rightRay.addColorStop(1, `rgba(167, 139, 250, ${0.68 * intensity})`);
		ctx.strokeStyle = rightRay;
		ctx.beginPath();
		ctx.moveTo(eyeX, eyeY);
		ctx.lineTo(targetRight, scanY);
		ctx.stroke();

		// 中心聚焦光丝
		const centerRay = ctx.createLinearGradient(eyeX, eyeY, targetMidX, scanY);
		centerRay.addColorStop(0, `rgba(255, 255, 255, ${0.88 * intensity})`);
		centerRay.addColorStop(0.55, hexToRgba(accent.bright, 0.28 * intensity));
		centerRay.addColorStop(1, `rgba(255, 255, 255, ${0.72 * intensity})`);
		ctx.strokeStyle = centerRay;
		ctx.lineWidth = 1.25;
		ctx.beginPath();
		ctx.moveTo(eyeX, eyeY);
		ctx.lineTo(targetMidX, scanY);
		ctx.stroke();

		// 发射眼聚亮光点
		const emitterGlow = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, 9);
		emitterGlow.addColorStop(0, `rgba(255, 255, 255, ${0.9 * intensity})`);
		emitterGlow.addColorStop(0.45, hexToRgba(accent.bright, 0.55 * intensity));
		emitterGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
		ctx.fillStyle = emitterGlow;
		ctx.beginPath();
		ctx.arc(eyeX, eyeY, 9, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();
	}
}

/**
 * 在任意收款码图片上方叠加 3D 烧结 / 激光打印式的棱镜扫线与前沿微粒层。
 * 成像进度达到 1 或归 0 时清空画布，保证静止态零噪点、100% 清晰可扫。
 */
export function renderLaserPrintOverlay(
	canvas: HTMLCanvasElement,
	progress: number,
	accent: RewardAccent,
	nowMs: number,
	direction: ScanDirection,
): void {
	const rect = canvas.getBoundingClientRect();
	if (rect.width < 8 || rect.height < 8) {
		return;
	}
	const { width, height, dpr } = syncCanvasResolution(
		canvas,
		rect.width,
		rect.height,
	);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return;
	}
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, width, height);

	const clamped = clamp01(progress);
	if (clamped <= 0.015 || clamped >= 0.992) {
		return;
	}

	const scanY = direction === "up" ? height * (1 - clamped) : height * clamped;
	const envelope = Math.sin(clamped * Math.PI);
	const flicker = 0.85 + 0.15 * Math.sin(nowMs * 0.095);
	const alpha = envelope * flicker;

	ctx.save();

	// 拖尾色散柔光（位于刚打印完成的已显影一侧）
	const trailSpan = 28;
	const trailStart = direction === "up" ? scanY - 6 : scanY + 6;
	const trailEnd = direction === "up" ? scanY + trailSpan : scanY - trailSpan;
	const trail = ctx.createLinearGradient(0, trailStart, 0, trailEnd);
	trail.addColorStop(0, "rgba(255, 255, 255, 0)");
	trail.addColorStop(0.24, `rgba(129, 140, 248, ${0.34 * alpha})`);
	trail.addColorStop(0.42, hexToRgba(accent.bright, 0.48 * alpha));
	trail.addColorStop(1, "rgba(255, 255, 255, 0)");
	ctx.fillStyle = trail;
	const rectTop = Math.min(trailStart, trailEnd);
	ctx.fillRect(0, rectTop, width, Math.abs(trailEnd - trailStart));

	// 激光烧结前沿微粒（模拟“滋滋滋”的逐行打码跳动感）
	const sparkCount = 26;
	const aheadSign = direction === "up" ? -1 : 1;
	for (let index = 0; index < sparkCount; index += 1) {
		const ratio = (index + 0.5) / sparkCount;
		const jitterX = Math.sin(nowMs * 0.042 + index * 7.3) * 3.8;
		const jitterY =
			aheadSign * (1.5 + Math.abs(Math.sin(nowMs * 0.058 + index * 3.7)) * 13);
		const sparkX = ratio * width + jitterX;
		const sparkY = scanY + jitterY;
		const sparkSize = index % 3 === 0 ? 2.8 : 2.1;

		ctx.fillStyle =
			index % 4 === 0
				? accent.bright
				: index % 4 === 1
					? "#818cf8"
					: index % 4 === 2
						? "#ffffff"
						: "#0f172a";
		ctx.globalAlpha = (index % 4 === 3 ? 0.55 : 0.84) * alpha;
		ctx.fillRect(sparkX, sparkY, sparkSize, sparkSize);
	}
	ctx.globalAlpha = 1;

	// 主棱镜激光线（高光白芯 + 渠道色与淡紫分色边缘）
	const lineGradient = ctx.createLinearGradient(0, scanY, width, scanY);
	lineGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
	lineGradient.addColorStop(0.12, hexToRgba(accent.bright, 0.94 * alpha));
	lineGradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.98 * alpha})`);
	lineGradient.addColorStop(0.88, `rgba(167, 139, 250, ${0.92 * alpha})`);
	lineGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
	ctx.fillStyle = lineGradient;
	ctx.fillRect(0, scanY - 1.25, width, 2.5);

	// 轻微色差副线
	ctx.fillStyle = hexToRgba(accent.main, 0.44 * alpha);
	ctx.fillRect(width * 0.06, scanY + aheadSign * 2.6, width * 0.88, 1);

	ctx.restore();
}
