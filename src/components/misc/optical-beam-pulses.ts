interface BeamPulses {
	add(animation: Animation, from: number, to: number, duration: number): void;
	invalidate(): void;
	reset(): void;
	dispose(): void;
}

interface DirtyRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface BoxBounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

interface SliceCache {
	matrix: DOMMatrix;
	bounds: BoxBounds;
}

interface PoseCache {
	width: number;
	height: number;
	dpr: number;
	pose: DOMMatrix;
	entry: DOMMatrix;
	inletBounds: BoxBounds;
	sliceBounds: SliceCache[];
}

function transformRectBounds(
	matrix: DOMMatrix,
	minX: number,
	minY: number,
	maxX: number,
	maxY: number,
): BoxBounds {
	const x0 = minX * matrix.a + minY * matrix.c + matrix.e;
	const y0 = minX * matrix.b + minY * matrix.d + matrix.f;
	const x1 = maxX * matrix.a + minY * matrix.c + matrix.e;
	const y1 = maxX * matrix.b + minY * matrix.d + matrix.f;
	const x2 = minX * matrix.a + maxY * matrix.c + matrix.e;
	const y2 = minX * matrix.b + maxY * matrix.d + matrix.f;
	const x3 = maxX * matrix.a + maxY * matrix.c + matrix.e;
	const y3 = maxX * matrix.b + maxY * matrix.d + matrix.f;
	return {
		minX: Math.min(x0, x1, x2, x3),
		maxX: Math.max(x0, x1, x2, x3),
		minY: Math.min(y0, y1, y2, y3),
		maxY: Math.max(y0, y1, y2, y3),
	};
}

function clampDirtyRect(
	bounds: BoxBounds,
	width: number,
	height: number,
	margin = 3,
): DirtyRect | null {
	const left = Math.max(0, Math.floor(bounds.minX - margin));
	const top = Math.max(0, Math.floor(bounds.minY - margin));
	const right = Math.min(width, Math.ceil(bounds.maxX + margin));
	const bottom = Math.min(height, Math.ceil(bounds.maxY + margin));
	const w = right - left;
	const h = bottom - top;
	if (w <= 0 || h <= 0) return null;
	return { x: left, y: top, w, h };
}

function unionDirtyRects(rects: DirtyRect[]): DirtyRect {
	let left = rects[0].x;
	let top = rects[0].y;
	let right = rects[0].x + rects[0].w;
	let bottom = rects[0].y + rects[0].h;
	for (let i = 1; i < rects.length; i++) {
		const r = rects[i];
		if (r.x < left) left = r.x;
		if (r.y < top) top = r.y;
		if (r.x + r.w > right) right = r.x + r.w;
		if (r.y + r.h > bottom) bottom = r.y + r.h;
	}
	return { x: left, y: top, w: right - left, h: bottom - top };
}

function clearDirtyRects(
	ctx: CanvasRenderingContext2D,
	rects: DirtyRect[],
): void {
	ctx.resetTransform();
	for (const r of rects) ctx.clearRect(r.x, r.y, r.w, r.h);
}

export function createBeamPulses(
	canvas: HTMLCanvasElement,
	beam: SVGGElement,
): BeamPulses | undefined {
	const rawContext = canvas.getContext("2d");
	const svg = beam.ownerSVGElement;
	const source = svg?.querySelector<SVGImageElement>("#optics-slice image");
	const inlet = beam.querySelector<SVGGElement>("[data-plane=incoming]");
	const outlet = beam.querySelector<SVGGElement>("[data-plane=outgoing]");
	if (!rawContext || !svg || !source || !inlet || !outlet) return;
	const context: CanvasRenderingContext2D = rawContext;

	const slices = Array.from(
		outlet.querySelectorAll<SVGUseElement>("[data-spectrum-segment]"),
	);
	const spectrum = new Image();
	const inletFade = svg.querySelector("#optics-inlet-fade");
	const fade = context.createLinearGradient(0, 0, 30, 0);
	for (const stop of inletFade?.querySelectorAll("stop") ?? []) {
		const alpha = 1 - Number(stop.getAttribute("stop-opacity") ?? 1);
		fade.addColorStop(stop.offset.baseVal, `rgb(0 0 0 / ${alpha})`);
	}
	const inletColor = context.createLinearGradient(0, -19, 0, 19);
	for (const stop of svg.querySelectorAll<SVGStopElement>(
		"#optics-pulse-inlet stop",
	)) {
		const opacity = stop.getAttribute("stop-opacity") ?? "1";
		inletColor.addColorStop(
			stop.offset.baseVal,
			`color-mix(in srgb, ${stop.getAttribute("stop-color")} ${Number(opacity) * 100}%, transparent)`,
		);
	}
	const band = context.createLinearGradient(-64, 0, 12, 0);
	for (const stop of svg.querySelectorAll<SVGStopElement>(
		"#optics-pulse stop",
	)) {
		band.addColorStop(
			stop.offset.baseVal,
			`rgb(255 255 255 / ${stop.getAttribute("stop-opacity") ?? 1})`,
		);
	}
	const pulses = new Map<
		Animation,
		{ from: number; to: number; duration: number }
	>();
	const inletEnd = inletFade ? 30 : 0;
	let frame = 0;
	let sliceMatrices: DOMMatrix[] | undefined;
	let cachedPose: PoseCache | undefined;
	let layoutDirty = true;
	let needsFullClear = false;
	let prevDirtyRects: DirtyRect[] = [];
	let combinedMask: CanvasRenderingContext2D | null = null;
	const resizeObserver = new ResizeObserver(() => {
		layoutDirty = true;
	});
	resizeObserver.observe(canvas);
	resizeObserver.observe(svg);

	function resolvePose(): PoseCache | undefined {
		if (!svg || !inlet || !outlet) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		if (!layoutDirty && cachedPose && cachedPose.dpr === dpr) {
			return cachedPose;
		}
		const cssWidth = canvas.clientWidth;
		const cssHeight = canvas.clientHeight;
		const ctm = beam.getCTM();
		if (!ctm || !cssWidth || !cssHeight) return;
		const svgStyle = getComputedStyle(svg);
		const ox =
			Number.parseFloat(svgStyle.left) - Number.parseFloat(svgStyle.width) / 2;
		const oy =
			Number.parseFloat(svgStyle.top) - Number.parseFloat(svgStyle.height) / 2;
		const width = Math.ceil(cssWidth * dpr);
		const height = Math.ceil(cssHeight * dpr);
		const pose = new DOMMatrix()
			.scale(dpr, dpr)
			.translate(ox, oy)
			.multiply(ctm);
		const entry = inlet.transform.baseVal.getItem(0).matrix;
		const inletBounds = transformRectBounds(entry, -4400, -19, inletEnd, 19);
		const exit = outlet.transform.baseVal.getItem(0).matrix;
		sliceMatrices ??= slices.map((slice) =>
			exit.multiply(slice.transform.baseVal.getItem(0).matrix),
		);
		const sliceBounds = sliceMatrices.map((matrix) => ({
			matrix,
			bounds: transformRectBounds(matrix, 0, 0, 1, 1),
		}));
		layoutDirty = false;
		cachedPose = {
			width,
			height,
			dpr,
			pose,
			entry,
			inletBounds,
			sliceBounds,
		};
		return cachedPose;
	}

	function computePacketLocalBounds(
		x: number,
		poseCache: PoseCache,
		hasSpectrum: boolean,
	): BoxBounds | null {
		const left = x - 64;
		const right = x + 12;
		let minX = Number.POSITIVE_INFINITY;
		let maxX = Number.NEGATIVE_INFINITY;
		let minY = Number.POSITIVE_INFINITY;
		let maxY = Number.NEGATIVE_INFINITY;
		const { inletBounds, sliceBounds } = poseCache;
		if (right >= inletBounds.minX && left <= inletBounds.maxX) {
			minX = Math.min(minX, Math.max(left, inletBounds.minX));
			maxX = Math.max(maxX, Math.min(right, inletBounds.maxX));
			minY = Math.min(minY, inletBounds.minY);
			maxY = Math.max(maxY, inletBounds.maxY);
		}
		if (hasSpectrum) {
			for (const { bounds } of sliceBounds) {
				if (right >= bounds.minX && left <= bounds.maxX) {
					minX = Math.min(minX, Math.max(left, bounds.minX));
					maxX = Math.max(maxX, Math.min(right, bounds.maxX));
					minY = Math.min(minY, bounds.minY);
					maxY = Math.max(maxY, bounds.maxY);
				}
			}
		}
		if (minX > maxX || minY > maxY) return null;
		return { minX, maxX, minY, maxY };
	}

	function drawBeamContent(
		x: number,
		localBounds: BoxBounds,
		poseCache: PoseCache,
		hasSpectrum: boolean,
	) {
		const left = x - 64;
		const right = x + 12;
		const { pose, entry, inletBounds, sliceBounds } = poseCache;
		context.setTransform(pose);
		context.beginPath();
		context.rect(
			localBounds.minX - 1,
			localBounds.minY - 2,
			localBounds.maxX - localBounds.minX + 2,
			localBounds.maxY - localBounds.minY + 4,
		);
		context.clip();
		if (right >= inletBounds.minX && left <= inletBounds.maxX) {
			context.setTransform(pose.multiply(entry));
			context.fillStyle = inletColor;
			context.fillRect(-4400, -19, 4400 + inletEnd, 38);
			if (inletFade) {
				context.globalCompositeOperation = "destination-out";
				context.fillStyle = fade;
				context.fillRect(0, -19, 30, 38);
				context.globalCompositeOperation = "source-over";
			}
		}
		if (hasSpectrum) {
			const half = spectrum.naturalHeight / 2;
			for (const { matrix, bounds } of sliceBounds) {
				if (right < bounds.minX || left > bounds.maxX) continue;
				context.setTransform(pose.multiply(matrix));
				context.drawImage(
					spectrum,
					0,
					half,
					spectrum.naturalWidth,
					half,
					0,
					0,
					1,
					1,
				);
			}
		}
	}

	const render = () => {
		frame = 0;
		const packets: { x: number; alpha: number }[] = [];
		for (const [animation, { from, to, duration }] of pulses) {
			if (
				animation.playState === "idle" ||
				animation.playState === "finished"
			) {
				pulses.delete(animation);
				continue;
			}
			const progress = Number(animation.currentTime) / duration;
			packets.push({
				x: from + (to - from) * progress,
				alpha: Math.min(1, progress / 0.045),
			});
		}
		if (!packets.length) {
			if (needsFullClear) {
				context.resetTransform();
				context.clearRect(0, 0, canvas.width, canvas.height);
				needsFullClear = false;
			} else if (prevDirtyRects.length) {
				clearDirtyRects(context, prevDirtyRects);
			}
			prevDirtyRects = [];
			return;
		}
		const poseCache = resolvePose();
		if (!poseCache) return;
		const { width, height, pose } = poseCache;
		const resized = canvas.width !== width || canvas.height !== height;
		if (canvas.width !== width) canvas.width = width;
		if (canvas.height !== height) canvas.height = height;
		if (!resized) {
			if (needsFullClear) {
				context.resetTransform();
				context.clearRect(0, 0, width, height);
			} else if (prevDirtyRects.length) {
				clearDirtyRects(context, prevDirtyRects);
			}
		}
		needsFullClear = false;

		const hasSpectrum = spectrum.naturalWidth > 0;
		const activePackets: {
			x: number;
			alpha: number;
			localBounds: BoxBounds;
			dirty: DirtyRect;
		}[] = [];
		const currDirtyRects: DirtyRect[] = [];
		for (const { x, alpha } of packets) {
			const localBounds = computePacketLocalBounds(x, poseCache, hasSpectrum);
			if (!localBounds) continue;
			const pixelBounds = transformRectBounds(
				pose,
				localBounds.minX,
				localBounds.minY,
				localBounds.maxX,
				localBounds.maxY,
			);
			const dirty = clampDirtyRect(pixelBounds, width, height);
			if (!dirty) continue;
			activePackets.push({ x, alpha, localBounds, dirty });
			currDirtyRects.push(dirty);
		}
		prevDirtyRects = currDirtyRects;

		if (activePackets.length === 1) {
			const { x, alpha, localBounds, dirty } = activePackets[0];
			context.save();
			context.resetTransform();
			context.beginPath();
			context.rect(dirty.x, dirty.y, dirty.w, dirty.h);
			context.clip();
			drawBeamContent(x, localBounds, poseCache, hasSpectrum);
			context.globalCompositeOperation = "destination-in";
			context.setTransform(pose);
			context.translate(x, 0);
			context.fillStyle = band;
			context.globalAlpha = alpha;
			context.fillRect(
				-64,
				localBounds.minY - 4,
				76,
				localBounds.maxY - localBounds.minY + 8,
			);
			context.restore();
		} else if (activePackets.length > 1) {
			const union = unionDirtyRects(currDirtyRects);
			context.save();
			context.resetTransform();
			context.beginPath();
			context.rect(union.x, union.y, union.w, union.h);
			context.clip();
			for (const { x, localBounds } of activePackets) {
				context.save();
				drawBeamContent(x, localBounds, poseCache, hasSpectrum);
				context.restore();
			}
			context.restore();

			combinedMask ??= document.createElement("canvas").getContext("2d");
			if (combinedMask) {
				const maskResized =
					combinedMask.canvas.width !== width ||
					combinedMask.canvas.height !== height;
				if (combinedMask.canvas.width !== width)
					combinedMask.canvas.width = width;
				if (combinedMask.canvas.height !== height)
					combinedMask.canvas.height = height;
				if (!maskResized) {
					combinedMask.resetTransform();
					combinedMask.clearRect(union.x, union.y, union.w, union.h);
				}
				for (const { x, alpha, localBounds } of activePackets) {
					combinedMask.setTransform(pose);
					combinedMask.translate(x, 0);
					combinedMask.fillStyle = band;
					combinedMask.globalAlpha = alpha;
					combinedMask.fillRect(
						-64,
						localBounds.minY - 4,
						76,
						localBounds.maxY - localBounds.minY + 8,
					);
				}
				combinedMask.globalAlpha = 1;
				context.save();
				context.resetTransform();
				context.globalCompositeOperation = "destination-in";
				context.drawImage(
					combinedMask.canvas,
					union.x,
					union.y,
					union.w,
					union.h,
					union.x,
					union.y,
					union.w,
					union.h,
				);
				context.restore();
			}
		}

		frame = requestAnimationFrame(render);
	};

	return {
		add(animation, from, to, duration) {
			if (!spectrum.src) spectrum.src = source.href.baseVal;
			pulses.set(animation, { from, to, duration });
			if (!frame) frame = requestAnimationFrame(render);
		},
		invalidate() {
			sliceMatrices = undefined;
			layoutDirty = true;
			if (prevDirtyRects.length) needsFullClear = true;
		},
		reset() {
			cancelAnimationFrame(frame);
			frame = 0;
			pulses.clear();
			canvas.width = canvas.height = 1;
			prevDirtyRects = [];
			needsFullClear = false;
			layoutDirty = true;
			cachedPose = undefined;
			combinedMask = null;
			sliceMatrices = undefined;
		},
		dispose() {
			this.reset();
			resizeObserver.disconnect();
		},
	};
}
