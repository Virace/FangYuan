import assert from "node:assert/strict";
import test from "node:test";

import { renderFeedHtml } from "../src/utils/rss-content.ts";

test("renderFeedHtml converts hl aside and fold directives into feed-safe html", () => {
	const html = renderFeedHtml(`
Before :hl[Important]{tone="warning"} after.

:::aside
PS block.
:::

:::fold{title="More" icon="bookmark" open="true"}
Hidden body.
:::

:::fold{title="Plain" icon="none"}
No icon body.
:::
`);

	assert.match(
		html,
		/<mark(?=[^>]*md-highlight)(?=[^>]*tone-warning)[^>]*>Important<\/mark>/,
	);
	assert.match(html, /<aside(?=[^>]*md-aside)[^>]*>[\s\S]*PS block\./);
	assert.match(
		html,
		/<details(?=[^>]*md-fold)(?=[^>]*data-icon="bookmark")[^>]*\sopen(?:=""|(?=[\s>]))[^>]*>[\s\S]*<summary(?=[^>]*md-fold-summary)[^>]*>More<\/summary>[\s\S]*Hidden body\./,
	);
	assert.match(
		html,
		/<details(?=[^>]*md-fold)(?=[^>]*data-icon="none")[^>]*>[\s\S]*<summary(?=[^>]*md-fold-summary)[^>]*>Plain<\/summary>[\s\S]*No icon body\./,
	);
	assert.doesNotMatch(
		html,
		/<details(?=[^>]*data-icon="none")[^>]*\sopen(?:=""|(?=[\s>]))[^>]*>[\s\S]*<summary(?=[^>]*md-fold-summary)[^>]*>Plain<\/summary>/,
	);
	assert.doesNotMatch(html, /:hl\[|:::fold|:::aside|<hl\b|<fold\b/);
});
