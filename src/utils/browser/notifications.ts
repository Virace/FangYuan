import type { NotificationConfig } from "../../types/config.ts";
import { type AutoDismissTone, getAutoDismissMs } from "./notice.ts";

export type NoticeScope = number | "site";
export type NoticeInput = {
	message: string;
	description?: string;
	tone?: AutoDismissTone;
	priority?: "normal" | "important";
	durationMs?: number;
	scope?: NoticeScope;
	key?: string;
	icon?: "announcement";
};
export type Notice = Required<Omit<NoticeInput, "key" | "icon">> & {
	id: number;
	key?: string;
	icon?: "announcement";
	phase: "pending" | "entering" | "visible" | "leaving";
	remainingMs: number;
	height: number;
	offset: number;
};
type NoticeRecord = Notice & {
	phaseMs: number;
	hovered: boolean;
	focused: boolean;
	returnToQueue: boolean;
};
export type NoticeSnapshot = {
	visible: Notice[];
	candidate: Notice | null;
};

/** 消息先入内存；宿主报告尺寸后准入，只有可读的 visible 阶段消耗停留时间。 */
export class NoticeCenter {
	private records: NoticeRecord[] = [];
	private listeners = new Set<(snapshot: NoticeSnapshot) => void>();
	private nextId = 0;
	private page = 0;
	private limit = 10;
	private availableHeight = 0;
	private reduced = false;
	private newestAtAnchor = false;
	private readonly gap = 12;

	getPageScope(): NoticeScope {
		return this.page;
	}

	show(input: NoticeInput): number {
		const scope = input.scope ?? this.page;
		if (scope !== "site" && scope !== this.page) return 0;
		const duplicate =
			input.key &&
			this.records.find(
				(notice) => notice.key === input.key && notice.scope === scope,
			);
		if (duplicate) return duplicate.id;
		const message = input.message.trim();
		if (!message) return 0;
		const tone = input.tone ?? "info";
		const description = input.description?.trim() ?? "";
		const durationMs =
			input.durationMs ?? getAutoDismissMs(`${message} ${description}`, tone);
		const id = ++this.nextId;
		this.records.push({
			...input,
			id,
			message,
			description,
			tone,
			scope,
			durationMs,
			priority: input.priority ?? "normal",
			remainingMs: durationMs,
			phase: "pending",
			height: 0,
			offset: 0,
			phaseMs: 0,
			hovered: false,
			focused: false,
			returnToQueue: false,
		});
		this.update();
		return id;
	}

	dismiss(id: number): void {
		const notice = this.records.find((entry) => entry.id === id);
		if (!notice) return;
		if (notice.phase === "pending") {
			this.records = this.records.filter((entry) => entry !== notice);
		} else {
			this.leave(notice);
		}
		this.update();
	}

	/** 必须在实际换页前调用；被取消或失败的导航不会改变当前代次。 */
	replacePage(): void {
		this.page++;
		for (const notice of [...this.records]) {
			if (notice.scope !== "site") this.dismiss(notice.id);
		}
	}

	subscribe(listener: (snapshot: NoticeSnapshot) => void): () => void {
		this.listeners.add(listener);
		listener(this.snapshot());
		return () => {
			this.listeners.delete(listener);
		};
	}

	setHeight(id: number, height: number): void {
		const notice = this.records.find((entry) => entry.id === id);
		if (!notice || height <= 0 || notice.height === height) return;
		notice.height = height;
		this.update();
	}

	setCapacity(height: number, limit = 10, reduced = false): void {
		this.availableHeight = Math.max(0, height);
		this.limit = Math.max(1, limit);
		this.reduced = reduced;
		this.update();
	}

	setPlacement({ position, newestOnTop }: NotificationConfig): void {
		this.newestAtAnchor = position === "top" ? newestOnTop : !newestOnTop;
		this.update();
	}

	setPaused(id: number, reason: "hovered" | "focused", paused: boolean): void {
		const notice = this.records.find((entry) => entry.id === id);
		if (!notice || notice[reason] === paused) return;
		notice[reason] = paused;
		this.update();
	}

	tick(elapsedMs: number, readable = true): void {
		let changed = false;
		for (const notice of this.records) {
			if (notice.phase === "entering" || notice.phase === "leaving") {
				notice.phaseMs -= elapsedMs;
				if (notice.phaseMs > 0 && !this.reduced) continue;
				if (notice.phase === "entering") notice.phase = "visible";
				else if (notice.returnToQueue) {
					notice.phase = "pending";
					notice.returnToQueue = false;
					notice.hovered = false;
					notice.focused = false;
				}
				changed = true;
			} else if (
				notice.phase === "visible" &&
				readable &&
				!notice.hovered &&
				!notice.focused &&
				notice.durationMs > 0
			) {
				notice.remainingMs = Math.max(0, notice.remainingMs - elapsedMs);
				if (notice.remainingMs === 0) {
					this.leave(notice);
					changed = true;
				}
			}
		}
		const retained = this.records.filter(
			(notice) => notice.phase !== "leaving" || notice.phaseMs > 0,
		);
		if (retained.length !== this.records.length) {
			this.records = retained;
			changed = true;
		}
		if (changed) this.update();
	}

	private leave(notice: NoticeRecord, returnToQueue = false): void {
		if (notice.phase === "leaving") {
			if (!returnToQueue) notice.returnToQueue = false;
			return;
		}
		notice.phase = "leaving";
		notice.phaseMs = this.reduced ? 0 : 160;
		notice.returnToQueue = returnToQueue;
	}

	private pending(): NoticeRecord[] {
		return this.records
			.filter((notice) => notice.phase === "pending")
			.sort(
				(left, right) =>
					Number(right.priority === "important") -
						Number(left.priority === "important") || left.id - right.id,
			);
	}

	private active(): NoticeRecord[] {
		return this.records.filter((notice) => notice.phase !== "pending");
	}

	private stackHeight(notices: NoticeRecord[]): number {
		return (
			notices.reduce((height, notice) => height + notice.height, 0) +
			Math.max(0, notices.length - 1) * this.gap
		);
	}

	private update(): void {
		let active = this.active();
		if (!active.some((notice) => notice.phase === "leaving")) {
			if (
				active.length > this.limit ||
				this.stackHeight(active) > this.availableHeight
			) {
				const candidate =
					[...active]
						.reverse()
						.find(
							(notice) =>
								notice.priority === "normal" &&
								!notice.hovered &&
								!notice.focused,
						) ?? active.at(-1);
				if (candidate) this.leave(candidate, true);
			} else {
				for (const candidate of this.pending()) {
					if (!candidate.height) break;
					const fits =
						active.length < this.limit &&
						this.stackHeight([...active, candidate]) <= this.availableHeight;
					if (!fits) {
						const evicted = active.find(
							(notice) =>
								notice.phase === "visible" &&
								notice.priority === "normal" &&
								!notice.hovered &&
								!notice.focused,
						);
						if (evicted) this.leave(evicted);
						break;
					}
					candidate.phase = "entering";
					candidate.phaseMs = this.reduced ? 0 : 240;
					// 准入时追加到末尾，排队优先级不改变已显示消息的先后。
					this.records = [
						...this.records.filter((notice) => notice !== candidate),
						candidate,
					];
					active = this.active();
				}
			}
		}
		let offset = 0;
		const ordered = this.active();
		if (this.newestAtAnchor) ordered.reverse();
		for (const notice of ordered) {
			notice.offset = offset;
			offset += notice.height + this.gap;
		}
		const snapshot = this.snapshot();
		for (const listener of this.listeners) listener(snapshot);
	}

	private snapshot(): NoticeSnapshot {
		return {
			visible: this.active().map((notice) => ({ ...notice })),
			candidate: this.pending()[0] ? { ...this.pending()[0] } : null,
		};
	}
}

export const notices: NoticeCenter = new NoticeCenter();

/** 异步请求须在开始时捕获 scope；scope: "site" 的消息跨页保留。 */
export function showNotice(input: NoticeInput): number {
	return notices.show(input);
}

export function getPageNoticeScope(): NoticeScope {
	return notices.getPageScope();
}

export function dismissNotice(id: number): void {
	notices.dismiss(id);
}
