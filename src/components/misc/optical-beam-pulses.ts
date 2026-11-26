interface BeamPulses {
	add(animation: Animation, from: number, to: number, duration: number): void;
	invalidate(): void;
	reset(): void;
}

export function createBeamPulses(
	canvas: HTMLCanvasElement,
	beam: SVGGElement,
): BeamPulses | undefined {
	const context = canvas.getContext("2d");
	const svg = beam.ownerSVGElement;
	const source = svg?.querySelector<SVGImageElement>("#optics-slice image");
	const inlet = beam.querySelector<SVGGElement>("[data-plane=incoming]");
	const outlet = beam.querySelector<SVGGElement>("[data-plane=outgoing]");
	if (!context || !svg || !source || !inlet || !outlet) return;

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
	let frame = 0;
	let sliceMatrices: DOMMatrix[] | undefined;
	let combinedMask: CanvasRenderingContext2D | null = null;

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
			context.resetTransform();
			context.clearRect(0, 0, canvas.width, canvas.height);
			return;
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
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const width = Math.ceil(cssWidth * dpr);
		const height = Math.ceil(cssHeight * dpr);
		const pose = new DOMMatrix()
			.scale(dpr, dpr)
			.translate(ox, oy)
			.multiply(ctm);
		if (canvas.width !== width) canvas.width = width;
		if (canvas.height !== height) canvas.height = height;
		context.resetTransform();
		context.clearRect(0, 0, width, height);
		context.save();
		context.setTransform(pose);
		context.beginPath();
		for (const { x } of packets) context.rect(x - 64, -4400, 76, 8800);
		context.clip();
		const entry = inlet.transform.baseVal.getItem(0).matrix;
		const inletEnd = inletFade ? 30 : 0;
		const overlaps = (left: number, right: number) =>
			packets.some(({ x }) => x + 12 >= left && x - 64 <= right);
		if (overlaps(entry.e - 4400 * entry.a, entry.e + inletEnd * entry.a)) {
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
		if (spectrum.naturalWidth) {
			const exit = outlet.transform.baseVal.getItem(0).matrix;
			sliceMatrices ??= slices.map((slice) =>
				exit.multiply(slice.transform.baseVal.getItem(0).matrix),
			);
			const half = spectrum.naturalHeight / 2;
			for (const matrix of sliceMatrices) {
				if (!overlaps(matrix.e, matrix.e + matrix.a)) continue;
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
		context.restore();

		context.globalCompositeOperation = "destination-in";
		let mask = context;
		if (packets.length > 1) {
			combinedMask ??= document.createElement("canvas").getContext("2d");
			if (combinedMask) {
				mask = combinedMask;
				if (mask.canvas.width !== width) mask.canvas.width = width;
				if (mask.canvas.height !== height) mask.canvas.height = height;
				mask.resetTransform();
				mask.clearRect(0, 0, width, height);
			}
		}
		for (const { x, alpha } of packets) {
			mask.setTransform(pose);
			mask.translate(x, 0);
			mask.fillStyle = band;
			mask.globalAlpha = alpha;
			mask.fillRect(-64, -4400, 76, 8800);
		}
		context.resetTransform();
		context.globalAlpha = 1;
		if (mask !== context) context.drawImage(mask.canvas, 0, 0);
		context.globalCompositeOperation = "source-over";
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
		},
		reset() {
			cancelAnimationFrame(frame);
			frame = 0;
			pulses.clear();
			canvas.width = canvas.height = 1;
			combinedMask = null;
			sliceMatrices = undefined;
		},
	};
}
