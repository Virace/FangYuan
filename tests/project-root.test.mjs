import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { fangyuanRoot, resolveFangYuanRoot } from "../src/utils/project-root.ts";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

test("fangyuan root resolves from source location instead of launch cwd", () => {
	assert.equal(resolveFangYuanRoot(), repoRoot);
	assert.equal(fangyuanRoot, repoRoot);
});
