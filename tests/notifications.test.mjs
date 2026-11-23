import assert from "node:assert/strict";
import test from "node:test";
import { NoticeCenter } from "../src/utils/browser/notifications.ts";

function snapshot(center) {
	let current;
	center.subscribe((value) => { current = value; })();
	return current;
}

function add(center, message, input = {}) {
	const id = center.show({ message, durationMs: 20_000, ...input });
	center.setHeight(id, 50);
	return id;
}

test("an error queued before the host mounts retains its complete reading time", () => {
	const center = new NoticeCenter();
	const id = center.show({ message: "API unavailable", priority: "important", durationMs: 20_000 });
	center.tick(60_000);
	assert.equal(snapshot(center).candidate.remainingMs, 20_000);
	center.setCapacity(800);
	center.setHeight(id, 50);
	center.tick(240);
	assert.equal(snapshot(center).visible[0].remainingMs, 20_000);
	center.tick(1000);
	assert.equal(snapshot(center).visible[0].remainingMs, 19_000);
});

test("A protected, B normal, C normal admits D by evicting B without reordering A and C", () => {
	const center = new NoticeCenter();
	center.setCapacity(800, 3);
	add(center, "A", { priority: "important" });
	add(center, "B");
	add(center, "C");
	center.tick(240);
	add(center, "D");
	assert.equal(snapshot(center).visible.length, 3);
	assert.equal(snapshot(center).visible.find((notice) => notice.phase === "leaving").message, "B");
	center.tick(160);
	assert.deepEqual(snapshot(center).visible.map((notice) => notice.message), ["A", "C", "D"]);
});

test("all protected slots make new notices wait, then give them their full duration", () => {
	const center = new NoticeCenter();
	center.setCapacity(800, 2);
	const first = add(center, "A", { priority: "important" });
	add(center, "B", { priority: "important" });
	center.tick(240);
	add(center, "C", { priority: "important" });
	center.tick(5000);
	assert.equal(snapshot(center).candidate.message, "C");
	assert.equal(snapshot(center).candidate.remainingMs, 20_000);
	center.dismiss(first);
	center.tick(160);
	center.tick(240);
	assert.deepEqual(snapshot(center).visible.map((notice) => notice.message), ["B", "C"]);
	assert.equal(snapshot(center).visible[1].remainingMs, 20_000);
});

test("hover, focus and a hidden page pause readable time independently; duplicates do not renew it", () => {
	const center = new NoticeCenter();
	center.setCapacity(800);
	const id = add(center, "A", { priority: "important", key: "failure" });
	center.tick(240);
	center.tick(5000);
	assert.equal(center.show({ message: "A", key: "failure", durationMs: 20_000 }), id);
	center.setPaused(id, "hovered", true);
	center.setPaused(id, "focused", true);
	center.tick(30_000);
	center.setPaused(id, "hovered", false);
	center.tick(30_000);
	center.setPaused(id, "focused", false);
	center.tick(30_000, false);
	assert.equal(snapshot(center).visible[0].remainingMs, 15_000);
	center.tick(15_000);
	assert.equal(snapshot(center).visible[0].phase, "leaving");
	center.tick(160);
	assert.equal(snapshot(center).visible.length, 0);
});

test("a completed page replacement rejects late old-page errors and preserves site announcements", () => {
	const center = new NoticeCenter();
	center.setCapacity(800);
	const oldScope = center.getPageScope();
	add(center, "old page");
	add(center, "site announcement", { scope: "site", priority: "important" });
	center.tick(240);
	center.replacePage();
	center.tick(160);
	assert.equal(center.show({ message: "late error", scope: oldScope }), 0);
	assert.deepEqual(snapshot(center).visible.map((notice) => notice.message), ["site announcement"]);
	assert.notEqual(center.getPageScope(), oldScope);
});

test("shrinking the viewport requeues protected content without consuming its remaining time", () => {
	const center = new NoticeCenter();
	center.setCapacity(800);
	add(center, "A", { priority: "important" });
	add(center, "B", { priority: "important" });
	center.tick(240);
	center.tick(1000);
	center.setCapacity(60);
	center.tick(160);
	assert.equal(snapshot(center).visible.length, 1);
	assert.equal(snapshot(center).candidate.message, "B");
	assert.equal(snapshot(center).candidate.remainingMs, 19_000);
	center.setCapacity(800);
	center.tick(240);
	assert.equal(snapshot(center).visible[1].remainingMs, 19_000);
});

test("the visible ceiling includes exiting notices and reduced motion still completes transitions", () => {
	const center = new NoticeCenter();
	center.setCapacity(1000, 10, true);
	for (let index = 0; index < 10; index++) add(center, String(index));
	center.tick(0);
	add(center, "new");
	assert.equal(snapshot(center).visible.length, 10);
	center.tick(0);
	assert.equal(snapshot(center).visible.length, 10);
	assert.equal(snapshot(center).visible.at(-1).message, "new");
});
