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
	const field = document.createElement("canvas");
	const paint = field.getContext("2d");
	const svg = beam.ownerSVGElement;
	const source = svg?.querySelector<SVGImageElement>("#optics-slice image");
	const inlet = beam.querySelector<SVGGElement>("[data-plane=incoming]");
	const slices = beam.querySelectorAll<SVGUseElement>(
		"[data-spectrum-segment]",
	);
	if (!context || !paint || !svg || !source || !inlet) return;

	const spectrum = new Image();
	const inletFade = svg.querySelector("#optics-inlet-fade");
	const fade = paint.createLinearGradient(0, 0, 30, 0);
	for (const stop of inletFade?.querySelectorAll("stop") ?? []) {
		const alpha = 1 - Number(stop.getAttribute("stop-opacity") ?? 1);
		fade.addColorStop(stop.offset.baseVal, `rgb(0 0 0 / ${alpha})`);
	}
	const inletColor = paint.createLinearGradient(0, -19, 0, 19);
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
	let dirty = true;
	let lastPose = "";
	spectrum.onload = () => {
		dirty = true;
	};

	const render = () => {
		frame = 0;
		for (const animation of pulses.keys()) {
			if (animation.playState === "idle" || animation.playState === "finished")
				pulses.delete(animation);
		}
		if (!pulses.size) return;
		const bounds = canvas.getBoundingClientRect();
		const pose = beam.getScreenCTM();
		if (!pose || !bounds.width || !bounds.height) return;
		pose.e -= bounds.left;
		pose.f -= bounds.top;
		const width = Math.ceil(bounds.width);
		const height = Math.ceil(bounds.height);
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = field.width = width;
			canvas.height = field.height = height;
			dirty = true;
		}
		const poseKey = pose.toString();
		if (dirty || poseKey !== lastPose) {
			paint.resetTransform();
			paint.clearRect(0, 0, width, height);
			const setPlane = (element: SVGGraphicsElement) => {
				const matrix = element.getScreenCTM();
				if (matrix)
					paint.setTransform(
						matrix.a,
						matrix.b,
						matrix.c,
						matrix.d,
						matrix.e - bounds.left,
						matrix.f - bounds.top,
					);
			};
			setPlane(inlet);
			paint.fillStyle = inletColor;
			paint.fillRect(-4400, -19, inletFade ? 4430 : 4400, 38);
			if (inletFade) {
				paint.globalCompositeOperation = "destination-out";
				paint.fillStyle = fade;
				paint.fillRect(0, -19, 30, 38);
				paint.globalCompositeOperation = "source-over";
			}
			if (spectrum.naturalWidth) {
				const half = spectrum.naturalHeight / 2;
				for (const slice of slices) {
					setPlane(slice);
					paint.drawImage(
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
			lastPose = poseKey;
			dirty = false;
		}
		context.resetTransform();
		context.clearRect(0, 0, width, height);
		context.globalCompositeOperation = "source-over";
		for (const [animation, { from, to, duration }] of pulses) {
			const progress = Number(animation.currentTime) / duration;
			context.setTransform(pose);
			context.translate(from + (to - from) * progress, 0);
			context.fillStyle = band;
			context.globalAlpha = Math.min(1, progress / 0.045);
			context.fillRect(-64, -4400, 76, 8800);
		}
		context.resetTransform();
		context.globalAlpha = 1;
		context.globalCompositeOperation = "source-in";
		context.drawImage(field, 0, 0);
		frame = requestAnimationFrame(render);
	};

	return {
		add(animation: Animation, from: number, to: number, duration: number) {
			if (!spectrum.src) spectrum.src = source.href.baseVal;
			pulses.set(animation, { from, to, duration });
			if (!frame) frame = requestAnimationFrame(render);
		},
		invalidate() {
			dirty = true;
		},
		reset() {
			cancelAnimationFrame(frame);
			frame = 0;
			pulses.clear();
			canvas.width = canvas.height = field.width = field.height = 1;
			dirty = true;
		},
	};
}
