interface SurfacePulse {
	animation: Animation;
	rotate(radians: number): void;
	remove(): void;
}

export function playSurfacePulse(
	templates: NodeListOf<HTMLTemplateElement>,
	from: number,
	to: number,
	duration: number,
	angle: number,
): SurfacePulse | undefined {
	const parts: {
		orbit: HTMLElement;
		counter: SVGSVGElement;
		sweep: Animation;
		stationary: Animation;
	}[] = [];
	for (const template of templates) {
		const fragment = template.content.cloneNode(true) as DocumentFragment;
		const orbit = fragment.querySelector<HTMLElement>(".flash-orbit");
		const band = fragment.querySelector<HTMLElement>(".flash-band");
		const material = fragment.querySelector<HTMLElement>(".flash-material");
		const counter = fragment.querySelector<SVGSVGElement>(".flash-counter");
		if (!orbit || !band || !material || !counter) continue;
		template.after(orbit);
		const offset = Number(template.dataset.flashOffset);
		const start = ((from + offset) / 480) * 100;
		const end = ((to + offset) / 480) * 100;
		const sweep = band.animate(
			[
				{ transform: `translateX(${start}%)`, opacity: 0 },
				{ opacity: 1, offset: 0.045 },
				{ transform: `translateX(${end}%)`, opacity: 1 },
			],
			duration,
		);
		const stationary = material.animate(
			[
				{ transform: `translateX(${-start}%)` },
				{ transform: `translateX(${-end}%)` },
			],
			duration,
		);
		parts.push({ orbit, counter, sweep, stationary });
	}
	if (!parts.length) return;
	const rotate = (radians: number) => {
		for (const { orbit, counter } of parts) {
			orbit.style.transform = `rotate(${radians}rad)`;
			counter.style.transform = `rotate(${-radians}rad)`;
		}
	};
	rotate(angle);
	return {
		animation: parts[0].sweep,
		rotate,
		remove() {
			for (const { orbit, sweep, stationary } of parts) {
				sweep.cancel();
				stationary.cancel();
				orbit.remove();
			}
		},
	};
}
