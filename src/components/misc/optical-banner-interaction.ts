import { createBeamPulses } from "./optical-beam-pulses";
import { projectDiamond } from "./optical-diamond";
import {
	type OpticalProjection,
	prismRadius,
	projectOptics,
	projectPrismGuide,
} from "./optical-projection";
import { projectSpectrum } from "./optical-spectrum";

class OpticalBanner extends HTMLElement {
	private cleanup?: () => void;

	connectedCallback() {
		const planes = Array.from(
			this.querySelectorAll<SVGElement>("[data-plane]"),
			(element) => ({
				element,
				name: element.dataset.plane as keyof OpticalProjection,
			}),
		);
		const svg = this.querySelector("svg");
		const lightPlane = this.querySelector<SVGGElement>(".light-plane");
		const lightOrbit = lightPlane?.querySelector<SVGGElement>("[data-orbit]");
		const inletHandle = lightPlane?.querySelector(
			".beam-handle[data-plane='incoming']",
		);
		const orbits = this.querySelectorAll<SVGGraphicsElement>("[data-orbit]");
		const prismProfile = this.dataset.prismProfile?.split(",").map(Number);
		const counterOrbit = this.querySelector("[data-counter-orbit]");
		const diamond = this.querySelectorAll<SVGPolygonElement>(
			"[data-diamond-facet]",
		);
		const guides: {
			points: [number, number][];
			path: SVGPathElement;
			light: Element;
		}[] = [];
		for (const group of this.querySelectorAll("[data-prism-guide]")) {
			const groove = group.querySelector("polyline");
			const path = group.querySelector("path");
			const light = group.querySelector("[data-guide-light]");
			if (!groove || !path || !light) continue;
			const points = Array.from(groove.points, (point): [number, number] => [
				point.x,
				point.y,
			]);
			guides.push({ points, path, light });
		}
		const segments = this.querySelectorAll<SVGUseElement>(
			"[data-spectrum-segment]",
		);
		const envelope = this.querySelector<SVGPathElement>("#optics-envelope");
		const pulseMask = this.querySelector<SVGMaskElement>("#optics-wave");
		const spill = this.querySelector<HTMLElement>(".optics-spill");
		const highlight = this.querySelector<SVGSVGElement>(".beam-light");
		if (!svg || !lightPlane || !lightOrbit || !pulseMask || !highlight) return;
		const pulseCanvas = this.querySelector<HTMLCanvasElement>(".beam-pulses");
		const beam = lightOrbit.querySelector<SVGGElement>("#optics-beams");
		let beamPulses: ReturnType<typeof createBeamPulses>;

		const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
		let x = 0;
		let y = 0;
		let targetX = 0;
		let targetY = 0;
		let frame = 0;
		let previousTime = 0;
		let touchStart: PointerEvent | undefined;
		let pendingMove: PointerEvent | undefined;
		let angle = 0;
		let targetAngle = 0;
		let tailAngle = 0;
		let tailVelocity = 0;
		let lastBend = 0;
		let drag:
			| {
					start: PointerEvent;
					offset: number;
					moved: boolean;
					point?: DOMPoint;
			  }
			| undefined;

		const bendSpectrum = (deflection: number) => {
			const bend = Math.round(deflection * 10000) / 10000;
			if (bend === lastBend) return;
			lastBend = bend;
			beamPulses?.invalidate();
			const shape = projectSpectrum(bend);
			segments.forEach((segment, index) => {
				segment.setAttribute("transform", shape.segments[index]);
			});
			envelope?.setAttribute("d", shape.envelope);
		};

		const rotateLight = (radians: number) => {
			angle = radians;
			const rotation = `rotate(${(angle * 180) / Math.PI})`;
			for (const orbit of orbits) orbit.setAttribute("transform", rotation);
			counterOrbit?.setAttribute(
				"transform",
				`rotate(${(-angle * 180) / Math.PI})`,
			);
		};
		const pointerAngle = (scenePoint: DOMPoint) => {
			const lens = lightPlane.transform.baseVal.getItem(0).matrix;
			const point = scenePoint.matrixTransform(lens.inverse());
			if (Math.hypot(point.x, point.y) > 4) return Math.atan2(point.y, point.x);
		};
		const alignDrag = () => {
			if (!drag?.point) return;
			const direction = pointerAngle(drag.point);
			if (direction === undefined) return;
			const delta = direction + drag.offset - targetAngle;
			targetAngle += Math.atan2(Math.sin(delta), Math.cos(delta));
		};
		const endDrag = () => {
			if (!drag) return;
			const { pointerId } = drag.start;
			drag = undefined;
			this.removeAttribute("data-dragging");
			if (this.hasPointerCapture(pointerId))
				this.releasePointerCapture(pointerId);
		};

		const draw = (viewChanged = true) => {
			beamPulses?.invalidate();
			const view = projectOptics(x, y, prismProfile, angle);
			for (const { element, name } of planes)
				element.setAttribute("transform", view[name]);
			for (const guide of guides) {
				const { path, opacity } = projectPrismGuide(guide.points, angle, view);
				guide.path.setAttribute("d", path);
				guide.light.setAttribute("opacity", String(opacity));
			}
			if (viewChanged && diamond.length) {
				const facets = projectDiamond(view.relief);
				diamond.forEach((element, i) => {
					const { points, fill, opacity } = facets[i];
					element.setAttribute("points", points);
					element.setAttribute("fill", fill);
					element.setAttribute("opacity", String(opacity));
				});
			}
		};
		const step = (time: number) => {
			const elapsed = Math.max(0, Math.min(time - previousTime, 32));
			const follow = 1 - Math.exp(-elapsed / 82);
			previousTime = time;
			applyPointerSample();
			const viewChanged = x !== targetX || y !== targetY;
			if (viewChanged) {
				x += (targetX - x) * follow;
				y += (targetY - y) * follow;
				if (Math.abs(targetX - x) + Math.abs(targetY - y) < 0.002) {
					x = targetX;
					y = targetY;
				}
			}
			alignDrag();
			const dt = elapsed / 1000;
			const orbitChanged = angle !== targetAngle;
			if (orbitChanged) {
				const difference = targetAngle - angle;
				rotateLight(
					Math.abs(difference) < 0.0004
						? targetAngle
						: angle + difference * follow,
				);
			}
			if (viewChanged || (prismProfile && orbitChanged)) draw(viewChanged);
			tailVelocity += ((angle - tailAngle) * 255 - tailVelocity * 20) * dt;
			tailAngle += tailVelocity * dt;
			if (
				Math.abs(angle - tailAngle) < 0.0004 &&
				Math.abs(tailVelocity) < 0.008
			) {
				tailAngle = angle;
				tailVelocity = 0;
			}
			bendSpectrum(0.21 * Math.tanh((tailAngle - angle) / 0.14));
			frame =
				x !== targetX ||
				y !== targetY ||
				angle !== targetAngle ||
				tailAngle !== angle ||
				tailVelocity !== 0
					? requestAnimationFrame(step)
					: 0;
		};
		const wake = () => {
			if (!frame) {
				previousTime = performance.now();
				frame = requestAnimationFrame(step);
			}
		};
		const aim = (nextX: number, nextY: number) => {
			targetX = nextX;
			targetY = nextY;
			if (x !== targetX || y !== targetY) wake();
		};
		const playPulse = (start?: PointerEvent) => {
			const matrix = lightOrbit.getScreenCTM();
			if (!matrix || motion.matches) return;
			const inverse = matrix.inverse();
			const rect = this.getBoundingClientRect();
			const bottom = spill?.getBoundingClientRect().bottom ?? rect.bottom;
			const top = Math.max(rect.top, -window.scrollY);
			const corners = [
				new DOMPoint(rect.left, top),
				new DOMPoint(rect.left, bottom),
				new DOMPoint(rect.right, top),
				new DOMPoint(rect.right, bottom),
			].map((point) => point.matrixTransform(inverse).x);
			const source =
				start && start.target === inletHandle
					? Math.min(
							prismProfile ? -prismRadius(prismProfile, angle + Math.PI) : -74,
							new DOMPoint(start.clientX, start.clientY).matrixTransform(
								inverse,
							).x,
						)
					: Math.min(...corners);
			const end = Math.max(...corners) + 70;
			const duration = Math.max(
				380,
				Math.min(1050, (end - source) * Math.hypot(matrix.a, matrix.b) * 0.67),
			);
			const packet = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"use",
			);
			packet.setAttribute("href", "#optics-packet");
			packet.setAttribute("opacity", "0");
			pulseMask.append(packet);
			this.toggleAttribute("data-pulsing", true);
			const sweep = packet.animate(
				[
					{ transform: `translateX(${source}px)`, opacity: 0 },
					{ opacity: 1, offset: 0.045 },
					{ transform: `translateX(${end}px)`, opacity: 1 },
				],
				{ duration },
			);
			sweep.onfinish = () => {
				packet.remove();
				if (!pulseMask.childElementCount) this.removeAttribute("data-pulsing");
			};
			if (pulseCanvas && beam) {
				beamPulses ??= createBeamPulses(pulseCanvas, beam);
				beamPulses?.add(sweep, source, end, duration);
			}
		};
		const reset = () => {
			beamPulses?.reset();
			endDrag();
			pendingMove = undefined;
			this.removeAttribute("data-lit");
			touchStart = undefined;
			cancelAnimationFrame(frame);
			frame = 0;
			x = y = targetX = targetY = 0;
			for (const animation of pulseMask.getAnimations({ subtree: true }))
				animation.cancel();
			pulseMask.replaceChildren();
			this.removeAttribute("data-pulsing");
			if (motion.matches) targetAngle = 0;
			rotateLight(targetAngle);
			tailAngle = angle;
			tailVelocity = 0;
			bendSpectrum(0);
			draw();
		};
		const applyPointerSample = () => {
			const event = pendingMove;
			pendingMove = undefined;
			if (!event) return;
			const rect = this.getBoundingClientRect();
			const matrix = svg.getScreenCTM();
			if (!matrix) return;
			const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
				matrix.inverse(),
			);
			const localX = event.clientX - rect.left;
			const localY = event.clientY - rect.top;
			if (drag?.moved) drag.point = point;
			const top = Math.max(rect.top, -window.scrollY);
			targetX = Math.max(-1, Math.min(1, (localX / rect.width) * 2 - 1));
			targetY = Math.max(
				-1,
				Math.min(
					1,
					((event.clientY - top) / Math.max(1, rect.bottom - top)) * 2 - 1,
				),
			);
			const scale = 1 / matrix.a;
			const radius = 58;
			highlight.style.transform = `translate3d(${localX - radius}px,${localY - radius}px,0)`;
			highlight.setAttribute(
				"viewBox",
				`${point.x - radius * scale} ${point.y - radius * scale} ${2 * radius * scale} ${2 * radius * scale}`,
			);
			this.toggleAttribute("data-lit", true);
		};
		this.onpointermove = (event) => {
			if ((event.pointerType === "touch" && !drag) || motion.matches) return;
			if (drag && event.pointerId !== drag.start.pointerId) return;
			if (
				drag &&
				!drag.moved &&
				Math.hypot(
					event.clientX - drag.start.clientX,
					event.clientY - drag.start.clientY,
				) >= 5
			) {
				drag.moved = true;
			}
			pendingMove = event;
			wake();
		};
		this.onpointerleave = () => {
			if (drag) return;
			pendingMove = undefined;
			this.removeAttribute("data-lit");
			aim(0, 0);
		};
		this.onpointerdown = (event) => {
			if (!event.isPrimary || drag) return;
			pendingMove = undefined;
			const onBeam =
				event.target instanceof Element && event.target.matches(".beam-handle");
			if (
				event.pointerType === "touch" &&
				!(prismProfile && onBeam && !motion.matches)
			) {
				this.removeAttribute("data-lit");
				aim(0, 0);
				touchStart = event;
				return;
			}
			if (event.button !== 0 || motion.matches || !onBeam) return;
			const matrix = svg.getScreenCTM();
			if (!matrix) return;
			const direction = pointerAngle(
				new DOMPoint(event.clientX, event.clientY).matrixTransform(
					matrix.inverse(),
				),
			);
			if (direction === undefined) return;
			pendingMove = event;
			wake();
			targetAngle = angle;
			drag = { start: event, offset: angle - direction, moved: false };
			this.setPointerCapture(event.pointerId);
			this.toggleAttribute("data-dragging", true);
			event.preventDefault();
		};
		this.onlostpointercapture = (event) => {
			if (event.pointerId === drag?.start.pointerId) {
				pendingMove = undefined;
				endDrag();
			}
		};
		this.onpointercancel = (event) => {
			if (event.pointerId === touchStart?.pointerId) touchStart = undefined;
			if (event.pointerId === drag?.start.pointerId) {
				pendingMove = undefined;
				endDrag();
				this.removeAttribute("data-lit");
				aim(0, 0);
			}
		};
		this.onpointerup = (event) => {
			if (drag && event.pointerId === drag.start.pointerId) {
				applyPointerSample();
				alignDrag();
				const { start, moved } = drag;
				endDrag();
				if (
					!moved &&
					Math.hypot(
						event.clientX - start.clientX,
						event.clientY - start.clientY,
					) < 5 &&
					(start.pointerType === "touch" || start.target === inletHandle)
				)
					playPulse(start);
				return;
			}
			const start = touchStart;
			if (!start || start.pointerId !== event.pointerId) return;
			touchStart = undefined;
			if (
				motion.matches ||
				Math.hypot(
					event.clientX - start.clientX,
					event.clientY - start.clientY,
				) > 9
			)
				return;
			playPulse(start);
		};

		const visibility = new IntersectionObserver(([entry]) => {
			if (!entry.isIntersecting) reset();
		});
		visibility.observe(this);
		const pulseOnNavigation = () => {
			const rect = this.getBoundingClientRect();
			if (rect.bottom > 0 && rect.top < innerHeight && !motion.matches)
				playPulse();
		};
		this.addEventListener("fangyuan:optical-pulse", pulseOnNavigation);
		motion.addEventListener("change", reset);
		this.cleanup = () => {
			reset();
			visibility.disconnect();
			this.removeEventListener("fangyuan:optical-pulse", pulseOnNavigation);
			motion.removeEventListener("change", reset);
		};
	}

	disconnectedCallback() {
		this.cleanup?.();
	}
}
if (!customElements.get("optical-banner")) {
	customElements.define("optical-banner", OpticalBanner);
}
