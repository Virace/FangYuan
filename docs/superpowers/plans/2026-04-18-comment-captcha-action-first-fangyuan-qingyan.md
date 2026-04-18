# Comment Captcha Action-First Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FangYuan comment and like interactions feel action-first instead of captcha-first: when captcha is required, the original action must stay intact, captcha must appear as a popover instead of inline insertion, no optimistic state should leak before success, and users must never be forced into a visible extra verification sub-task.

**Architecture:** Shift the integration from a session-state-driven captcha UX to an action-driven write contract. QingYan write endpoints should accept optional captcha payload on the original write requests, while FangYuan should keep a pending action behind the original CTA, show captcha in a popover styled like the emoji popover, and lock the triggering action until captcha is handled instead of exposing a separate verification workflow. Keep `captcha/state` only for challenge acquisition/refresh and backward compatibility; remove it from the normal “is captcha verified?” UI loop.

**Tech Stack:** Astro, Svelte, TypeScript, Fastify, Zod, Drizzle, Vitest/node:test

---

## File Map

### FangYuan

- Modify: `src/components/comments/CommentSection.svelte`
  - owns comment submit / vote retry state and captcha presentation
- Modify: `src/components/comments/CommentComposer.svelte`
  - reuses the submit CTA while hosting the captcha popover anchor
- Modify: `src/components/comments/CommentItem.svelte`
  - keeps vote confirmation and captcha retry state aligned without inline insertion
- Modify: `src/components/comments/CommentCaptchaInlineValue.svelte`
  - turns captcha image into refresh affordance and removes standalone verify CTA in the action-first path
- Modify: `src/components/comments/InlineCommentCaptcha.svelte`
  - renders challenge input only; parent owns when to submit/retry and whether it is inside a popover shell
- Modify: `src/styles/main.css`
  - adds captcha popover shell based on the emoji popover visual language
- Modify: `src/components/page-feedback/PostFeedback.svelte`
  - keeps page-like pending action, decouples page-like captcha from comment bootstrap state, and anchors captcha to the like CTA
- Modify: `src/utils/comments/provider.ts`
  - adds shared pending-action/captcha payload types where needed
- Modify: `src/utils/qingyan/client.ts`
  - serializes captcha payload into write requests and stops treating captcha verification as a first-class UI workflow
- Modify: `src/utils/qingyan/contracts.ts`
  - updates request/response types for inline captcha-on-write contract
- Test: `tests/comment-ui-contract.test.mjs`
- Test: `tests/comment-captcha-contract.test.mjs`
- Test: `tests/qingyan-mock-api.test.mjs`

### QingYan

- Modify: `../QingYan/src/modules/comments/schemas.ts`
  - add optional captcha payload to create/vote bodies
- Modify: `../QingYan/src/modules/comments/public-routes.ts`
  - parse captcha payload on write routes, keep `captcha/state` for challenge acquisition and refresh
- Modify: `../QingYan/src/modules/comments/write-service.ts`
  - validate optional captcha payload inline during comment create and comment vote
- Modify: `../QingYan/src/modules/comments/captcha-service.ts`
  - expose “resolve challenge for write” and “consume captcha inline” helpers; stop forcing normal UI to poll status
- Modify: `../QingYan/src/modules/page-feedback/public-routes.ts`
  - parse optional captcha payload for page like
- Modify: `../QingYan/src/modules/page-feedback/service.ts`
  - use page-like-specific captcha action, not `comment_create`
- Modify: `../QingYan/src/modules/dev/mock-service.ts`
  - mirror the new inline captcha-on-write contract and challenge refresh behavior
- Modify: `../QingYan/src/modules/dev/service.ts`
  - keep dev scenario/state responses aligned if route payload changes
- Test: `../QingYan/tests/integration/comment-captcha.test.ts`
- Test: `../QingYan/tests/integration/logging-business-events.test.ts`
- Test: `../QingYan/tests/integration/page-feedback*.test.ts` (existing file or new targeted test)
- Test: `../QingYan/tests/support/captcha.ts`

### Deliberately Out of Scope for This Push

- Admin UI for per-action captcha settings in QingYan
- Reworking future `iframe_widget` / `token_widget` flows
- Large visual redesign of vote confirmation beyond removing captcha friction

---

## Behavior Matrix

### Required end state

- Comment submit:
  - first click may return `CAPTCHA_REQUIRED`
  - input content and reply target stay intact
  - captcha appears as a popover anchored to the triggering area, not inline in the layout flow
  - clicking outside does not dismiss captcha
  - clicking captcha image refreshes challenge
  - user enters captcha and clicks the same submit button once
  - while captcha is unresolved, repeated clicks on the submit button do not create duplicate requests
  - request includes original comment payload + captcha payload

- Comment vote:
  - no optimistic vote count change before success
  - if confirmation stays, captcha cannot force the user through an extra disconnected loop
  - captcha appears as a popover, not an inserted inline block
  - while captcha is unresolved, repeated clicks on the vote CTA do not create duplicate requests
  - if vote captcha is still enabled, the retry must resume the original vote action without clearing pending context

- Page like:
  - no like count or liked state change before success
  - captcha appears as a popover anchored to the like CTA, not an inline block
  - while captcha is unresolved, repeated clicks on the like CTA do not create duplicate requests
  - page-like captcha, if enabled, is driven by the like action itself, not by comment bootstrap state

### Current drift to remove

- Frontend standalone `verify captcha` CTA creates an extra visible task
- `handlePollCaptchaStatus()` treats captcha as a primary UI workflow
- captcha currently appears inline in the flow, increasing perceived intrusion
- `submitVote()` performs optimistic update before captcha gate succeeds
- QingYan write endpoints do not accept captcha payload
- QingYan page-like currently calls `captchaService.ensureSatisfied(... action: "comment_create")`, which is the wrong action identity

---

### Task 1: Lock the Contract Shape

**Files:**
- Modify: `src/utils/comments/provider.ts`
- Modify: `src/utils/qingyan/contracts.ts`
- Modify: `src/utils/qingyan/client.ts`
- Modify: `../QingYan/src/modules/comments/schemas.ts`
- Modify: `../QingYan/src/modules/page-feedback/schemas.ts` (if file exists; otherwise the route-local schema source)
- Test: `tests/comment-captcha-contract.test.mjs`

- [ ] **Step 1: Define the contract changes in one place before touching UI or services**

Add these shapes conceptually:

```ts
type InlineCaptchaPayload = {
  challengeId: string;
  value: string;
};

type PendingCommentAction = {
  kind: "comment_submit";
  payload: {
    authorName: string;
    authorEmail: string;
    authorWebsite: string;
    content: string;
    parentId: string | null;
  };
};

type PendingVoteAction = {
  kind: "comment_vote";
  payload: {
    commentId: string;
    choice: "up" | "down";
  };
};

type PendingPageLikeAction = {
  kind: "page_like";
};
```

- [ ] **Step 2: Add failing contract assertions**

Run:

```bash
node --test tests/comment-captcha-contract.test.mjs
```

Expected: FAIL because FangYuan client and QingYan schema do not yet show captcha-on-write payload support for comment/vote/like.

- [ ] **Step 3: Update contract-level tests**

Add assertions that:

```js
assert.match(qingyanClientSource, /createComment[\s\S]*captcha/);
assert.match(qingyanClientSource, /voteComment[\s\S]*captcha/);
assert.match(qingyanClientSource, /likePage[\s\S]*captcha/);
assert.doesNotMatch(qingyanClientSource, /handlePollCaptchaStatus/);
```

- [ ] **Step 4: Commit the contract-first checkpoint**

```bash
git add tests/comment-captcha-contract.test.mjs src/utils/comments/provider.ts src/utils/qingyan/contracts.ts src/utils/qingyan/client.ts ../QingYan/src/modules/comments/schemas.ts ../QingYan/src/modules/page-feedback/schemas.ts
git commit -m "test(captcha): 锁定动作优先验证码契约"
```

---

### Task 2: Make QingYan Comment Writes Accept Captcha Inline

**Files:**
- Modify: `../QingYan/src/modules/comments/schemas.ts`
- Modify: `../QingYan/src/modules/comments/public-routes.ts`
- Modify: `../QingYan/src/modules/comments/write-service.ts`
- Modify: `../QingYan/src/modules/comments/captcha-service.ts`
- Test: `../QingYan/tests/integration/comment-captcha.test.ts`

- [ ] **Step 1: Add failing integration coverage for comment create retry**

Write/adjust a test that does this:

```ts
// first create attempt returns COMMENT_CAPTCHA_REQUIRED with challenge
// second create attempt sends the same comment body + captcha payload
// response succeeds without calling /comments/captcha/verify separately
```

- [ ] **Step 2: Run the targeted QingYan test**

Run:

```bash
pnpm test -- tests/integration/comment-captcha.test.ts
```

Expected: FAIL because `/comments` does not accept captcha payload yet.

- [ ] **Step 3: Update request schemas and routes**

Accept optional captcha payload on comment create:

```ts
captcha: z.object({
  challengeId: z.string().min(1),
  value: z.string().min(1),
}).optional().nullable()
```

Pass it through `public-routes.ts` into `writeService.createComment(...)`.

- [ ] **Step 4: Inline captcha consumption inside write service**

Before `ensureSatisfied(...)`, do:

```ts
if (input.captcha) {
  await this.captchaService.consumeInlineCaptcha({
    siteKey: input.siteKey,
    pageKey: input.pageKey,
    challengeId: input.captcha.challengeId,
    value: input.captcha.value,
    visitorKey: input.visitorKey,
    ip: input.ip,
    userAgent: input.userAgent,
    requestId: input.requestId,
  });
}
```

Then let the existing write path continue and succeed in the same request.

- [ ] **Step 5: Re-run the targeted test**

Run:

```bash
pnpm test -- tests/integration/comment-captcha.test.ts
```

Expected: PASS for comment create inline captcha retry path.

- [ ] **Step 6: Commit**

```bash
git add ../QingYan/src/modules/comments/schemas.ts ../QingYan/src/modules/comments/public-routes.ts ../QingYan/src/modules/comments/write-service.ts ../QingYan/src/modules/comments/captcha-service.ts ../QingYan/tests/integration/comment-captcha.test.ts
git commit -m "feat(captcha): 支持评论写入内联验证码重试"
```

---

### Task 3: Fix QingYan Vote and Page-Like Action Identity

**Files:**
- Modify: `../QingYan/src/modules/comments/write-service.ts`
- Modify: `../QingYan/src/modules/page-feedback/public-routes.ts`
- Modify: `../QingYan/src/modules/page-feedback/service.ts`
- Modify: `../QingYan/src/modules/comments/captcha-service.ts`
- Modify: `../QingYan/src/modules/dev/mock-service.ts`
- Test: `../QingYan/tests/integration/page-feedback*.test.ts`
- Test: `../QingYan/tests/integration/logging-business-events.test.ts`

- [ ] **Step 1: Add failing tests for vote/like inline retry and correct action tagging**

Cover both:

```ts
// comment vote retry with captcha payload
// page like should not use action: "comment_create"
```

- [ ] **Step 2: Run targeted tests**

Run:

```bash
pnpm test -- tests/integration/logging-business-events.test.ts tests/integration/page-feedback*.test.ts
```

Expected: FAIL because page-like currently routes through `comment_create` captcha semantics and no write route accepts captcha payload.

- [ ] **Step 3: Add explicit action identities**

Introduce action values that reflect reality:

```ts
type CaptchaAction = "comment_create" | "comment_vote" | "page_like";
```

Update any helper that currently assumes only comment create/vote.

- [ ] **Step 4: Allow page-like and vote writes to consume captcha inline**

Make `voteComment` and `likePage` request bodies accept optional captcha payload and pass it through service methods.

- [ ] **Step 5: Re-run targeted tests**

Run:

```bash
pnpm test -- tests/integration/logging-business-events.test.ts tests/integration/page-feedback*.test.ts tests/integration/comment-captcha.test.ts
```

Expected: PASS on inline retry flow and correct action identity.

- [ ] **Step 6: Commit**

```bash
git add ../QingYan/src/modules/comments/write-service.ts ../QingYan/src/modules/page-feedback/public-routes.ts ../QingYan/src/modules/page-feedback/service.ts ../QingYan/src/modules/comments/captcha-service.ts ../QingYan/src/modules/dev/mock-service.ts ../QingYan/tests/integration/logging-business-events.test.ts ../QingYan/tests/integration/page-feedback*.test.ts
git commit -m "fix(captcha): 对齐投票与点赞动作门禁"
```

---

### Task 4: Rebuild FangYuan Comment Flow Around Pending Action

**Files:**
- Modify: `src/components/comments/CommentSection.svelte`
- Modify: `src/components/comments/CommentComposer.svelte`
- Modify: `src/components/comments/CommentCaptchaInlineValue.svelte`
- Modify: `src/components/comments/InlineCommentCaptcha.svelte`
- Modify: `src/styles/main.css`
- Modify: `src/utils/qingyan/client.ts`
- Test: `tests/comment-ui-contract.test.mjs`

- [ ] **Step 1: Add failing UI contract assertions**

Assert that:

```js
assert.match(commentSectionSource, /pendingCommentAction/);
assert.match(commentSectionSource, /handleSubmit[\s\S]*captcha:/);
assert.doesNotMatch(commentSectionSource, /handlePollCaptchaStatus/);
assert.doesNotMatch(commentCaptchaInlineValueSource, /commentsCaptchaVerify/);
assert.match(mainCssSource, /comment-captcha-popover-wrap/);
assert.match(mainCssSource, /comment-captcha-popover/);
```

- [ ] **Step 2: Run the contract test**

Run:

```bash
node --test tests/comment-ui-contract.test.mjs
```

Expected: FAIL because comment flow still uses separate verify/status steps.

- [ ] **Step 3: Preserve pending comment action**

In `CommentSection.svelte`, keep:

```ts
let pendingAction: PendingCommentAction | PendingVoteAction | null = null;
let captchaInputValue = "";
let captchaLocked = false;
```

When comment submit hits `CommentCaptchaRequiredError`, set `pendingAction = { kind: "comment_submit", ... }`, show captcha, and do not clear composer fields.

- [ ] **Step 4: Move captcha into a popover and remove standalone verify CTA**

`CommentCaptchaInlineValue.svelte` should render only challenge image + input. The surrounding popover shell should reuse the emoji-popover visual language from `CommentComposer.svelte`, but it must not dismiss on outside click.

```svelte
<button aria-label={i18n(I18nKey.commentsCaptchaRefresh)}>...</button>
<input ... />
```

No dedicated “验证验证码” button in the normal inline path. The parent submit button remains the only primary CTA.

- [ ] **Step 5: Second submit sends captcha with the original action**

When `pendingAction.kind === "comment_submit"`, `handleSubmit(...)` should call `qingyanClient.createComment({... captcha })` and clear state only on success.

- [ ] **Step 6: Lock the triggering button while captcha is unresolved**

Use a state like:

```ts
const submitBlockedByCaptcha =
  pendingAction?.kind === "comment_submit" && !captchaState?.verified;
```

Repeated clicks on the submit button while that state is true must not create a second network attempt; they should only keep the popover visible/focused.

- [ ] **Step 7: Re-run UI contract test**

Run:

```bash
node --test tests/comment-ui-contract.test.mjs
```

Expected: PASS for action-first comment flow contract.

- [ ] **Step 8: Commit**

```bash
git add src/components/comments/CommentSection.svelte src/components/comments/CommentComposer.svelte src/components/comments/CommentCaptchaInlineValue.svelte src/components/comments/InlineCommentCaptcha.svelte src/styles/main.css src/utils/qingyan/client.ts tests/comment-ui-contract.test.mjs
git commit -m "feat(comment): 改为动作优先验证码提交流"
```

---

### Task 5: Remove Broken Optimism From Vote and Like Paths

**Files:**
- Modify: `src/components/comments/CommentSection.svelte`
- Modify: `src/components/comments/CommentItem.svelte`
- Modify: `src/components/page-feedback/PostFeedback.svelte`
- Modify: `src/styles/main.css`
- Modify: `src/utils/qingyan/client.ts`
- Test: `tests/comment-ui-contract.test.mjs`

- [ ] **Step 1: Add failing assertions for non-optimistic gated actions**

Assert that:

```js
assert.doesNotMatch(commentSectionSource, /buildOptimisticVoteComment/);
assert.match(postFeedbackSource, /pendingLikeAction/);
assert.match(postFeedbackSource, /likePage[\s\S]*captcha/);
assert.doesNotMatch(postFeedbackSource, /onVerifyCaptcha/);
```

- [ ] **Step 2: Run the test to verify failure**

Run:

```bash
node --test tests/comment-ui-contract.test.mjs
```

Expected: FAIL because vote still optimistically mutates and page like still uses standalone captcha verify flow.

- [ ] **Step 3: Make vote path action-first and popover-based**

Do not mutate vote counts before QingYan accepts the write. Keep the existing confirm UI if desired, but once the user confirms, preserve the vote action and retry it with captcha payload instead of clearing `pendingVoteTarget`.

- [ ] **Step 4: Decouple page-like from comment bootstrap captcha**

`PostFeedback.svelte` should only show captcha after a like action explicitly needs it. Do not drive page-like CTA off `payload.captcha.required` from comment bootstrap.

- [ ] **Step 5: Lock vote/like triggers while captcha is unresolved**

Use per-action pending state so that:

```ts
pendingAction?.kind === "comment_vote"
pendingAction?.kind === "page_like"
```

prevent duplicate requests while the captcha popover is open and unresolved. Clicking the original CTA again should not produce a second network request.

- [ ] **Step 6: Re-run the contract test**

Run:

```bash
node --test tests/comment-ui-contract.test.mjs
```

Expected: PASS for no-optimism and no-extra-verify interactions.

- [ ] **Step 7: Commit**

```bash
git add src/components/comments/CommentSection.svelte src/components/comments/CommentItem.svelte src/components/page-feedback/PostFeedback.svelte src/styles/main.css src/utils/qingyan/client.ts tests/comment-ui-contract.test.mjs
git commit -m "fix(feedback): 收敛投票与点赞验证码重试流"
```

---

### Task 6: Verification and Regression Sweep

**Files:**
- Verify only

- [ ] **Step 1: Run FangYuan targeted checks**

Run:

```bash
pnpm format
pnpm lint
node --test tests/comment-ui-contract.test.mjs tests/comment-captcha-contract.test.mjs tests/qingyan-mock-api.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run QingYan targeted checks**

Run:

```bash
pnpm test -- tests/integration/comment-captcha.test.ts tests/integration/logging-business-events.test.ts tests/integration/page-feedback*.test.ts
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Manual browser verification**

Verify in FangYuan dev mode:

```text
1. 评论首次提交触发验证码，输入不丢失
2. 点击验证码图片可刷新
3. 输入验证码后再次点击“发表评论”，一次完成评论
4. 页面点赞若命中验证码，不出现单独 verify 子任务
5. 任何 captcha-required 情况下，成功前 UI 不做 optimistic 变化
6. 验证码弹出层点击外部不关闭
7. 验证码未处理时重复点击原按钮不产生重复请求
```

- [ ] **Step 4: Final integration commit**

```bash
git status --short
```

Stage only the intended FangYuan/QingYan files and create the final integration commit after both repos are green.

---

## Scope Decision Notes

- **This push should ship the UX fix first.** The mandatory part is action-first retry with no extra visible verify step.
- **Per-action captcha policy should be introduced in backend types/helpers now, but admin settings UI can wait.** Minimum useful split:
  - `comment_create`
  - `comment_vote`
  - `page_like`
- **Do not keep `handlePollCaptchaStatus()` in FangYuan’s normal inline captcha path.** It is engineering-correct for async widgets, but it is the wrong center of gravity for this product flow.

## Self-Review

- Spec coverage:
  - comment submit one-primary-CTA retry: covered in Tasks 2 and 4
  - like/vote no extra captcha task: covered in Tasks 3 and 5
  - captcha image click refresh: covered in Tasks 2, 3, 4
  - no pre-success state mutation: covered in Task 5
  - future per-action captcha policy: covered in Task 3
- Placeholder scan:
  - no TODO/TBD placeholders left
- Type consistency:
  - one shared term used throughout: `captcha payload`, `pending action`, `action-first`

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-18-comment-captcha-action-first-fangyuan-qingyan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
