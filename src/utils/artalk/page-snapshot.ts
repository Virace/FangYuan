export type ArtalkPageSnapshot = {
	id: number;
	key: string;
	siteName: string;
	adminOnly: boolean;
	pv: number;
	voteUp: number;
	voteDown: number;
	title?: string;
	url?: string;
};

const snapshotCache = new Map<string, ArtalkPageSnapshot>();
const pendingSnapshotLoads = new Map<string, Promise<ArtalkPageSnapshot | null>>();
const snapshotWaiters = new Map<
	string,
	Set<(snapshot: ArtalkPageSnapshot | null) => void>
>();

export function getArtalkPageSnapshot(postKey: string): ArtalkPageSnapshot | null {
	return snapshotCache.get(postKey) ?? null;
}

export function setArtalkPageSnapshot(
	postKey: string,
	snapshot: ArtalkPageSnapshot,
): ArtalkPageSnapshot {
	snapshotCache.set(postKey, snapshot);
	const waiters = snapshotWaiters.get(postKey);
	if (waiters) {
		for (const resolve of waiters) {
			resolve(snapshot);
		}
		snapshotWaiters.delete(postKey);
	}
	return snapshot;
}

export function setArtalkPageSnapshotLoad(
	postKey: string,
	promise: Promise<ArtalkPageSnapshot | null>,
): Promise<ArtalkPageSnapshot | null> {
	pendingSnapshotLoads.set(postKey, promise);
	void promise.finally(() => {
		if (pendingSnapshotLoads.get(postKey) === promise) {
			pendingSnapshotLoads.delete(postKey);
		}
	});
	return promise;
}

export function getArtalkPageSnapshotLoad(
	postKey: string,
): Promise<ArtalkPageSnapshot | null> | null {
	return pendingSnapshotLoads.get(postKey) ?? null;
}

export function waitForArtalkPageSnapshot(
	postKey: string,
	timeoutMs = 600,
): Promise<ArtalkPageSnapshot | null> {
	const cachedSnapshot = snapshotCache.get(postKey);
	if (cachedSnapshot) {
		return Promise.resolve(cachedSnapshot);
	}

	const pendingSnapshot = pendingSnapshotLoads.get(postKey);
	if (pendingSnapshot) {
		return pendingSnapshot;
	}

	return new Promise((resolve) => {
		const waiters = snapshotWaiters.get(postKey) ?? new Set();
		const wrappedResolve = (snapshot: ArtalkPageSnapshot | null) => {
			clearTimeout(timeout);
			waiters.delete(wrappedResolve);
			if (waiters.size === 0) {
				snapshotWaiters.delete(postKey);
			}
			resolve(snapshot);
		};

		const timeout = setTimeout(() => {
			waiters.delete(wrappedResolve);
			if (waiters.size === 0) {
				snapshotWaiters.delete(postKey);
			}
			resolve(null);
		}, timeoutMs);

		waiters.add(wrappedResolve);
		snapshotWaiters.set(postKey, waiters);
	});
}

export function patchArtalkPageSnapshot(
	postKey: string,
	patch: Partial<Pick<ArtalkPageSnapshot, "pv" | "voteUp" | "voteDown">>,
): ArtalkPageSnapshot | null {
	const snapshot = snapshotCache.get(postKey);
	if (!snapshot) {
		return null;
	}

	const nextSnapshot = {
		...snapshot,
		...patch,
	};
	snapshotCache.set(postKey, nextSnapshot);
	return nextSnapshot;
}

export function mapArtalkPageSnapshot(page: {
	id: number;
	key: string;
	site_name: string;
	admin_only: boolean;
	pv: number;
	vote_up: number;
	vote_down: number;
	title?: string;
	url?: string;
}): ArtalkPageSnapshot {
	return {
		id: page.id,
		key: page.key,
		siteName: page.site_name,
		adminOnly: page.admin_only,
		pv: page.pv,
		voteUp: page.vote_up,
		voteDown: page.vote_down,
		title: page.title,
		url: page.url,
	};
}
