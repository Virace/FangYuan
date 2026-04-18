# QingYan Dev Scenarios Guide

## Goal

Use real `QingYan /api/dev/*` routes to push the backend into a UI state that `FangYuan` can observe through the normal `/api/comments/*` and `/api/page-feedback/like` endpoints.

## Prerequisites

1. Start `QingYan` locally
2. Start `FangYuan` with `pnpm dev` or `pnpm dev:full`
3. Make sure `site/config.ts` points `qingyanDevProxyTarget` at the real local `QingYan`

## Common Commands

```bash
pnpm qingyan:scenario -- --name comments-seeded-thread --page-key post:seeded-demo --page-title "Seeded Demo" --page-url /posts/seeded-demo/
pnpm qingyan:scenario -- --name comments-captcha-always --page-key post:always-demo --page-title "Always Demo" --page-url /posts/always-demo/
pnpm qingyan:scenario -- --name comments-threshold-next-write --page-key post:threshold-demo
pnpm qingyan:state -- --page-key post:threshold-demo
pnpm qingyan:reset -- --page-key post:empty-demo
```

## Rules

- Runtime UI scenario control belongs to `QingYan /api/dev/*`
- Normal page read and write traffic must still go through the standard `/api/comments/*` and `/api/page-feedback/like` endpoints
- Do not edit `qingyan.yml` or other backend config files just to force captcha visibility for UI testing

## Scenarios

### `seeded-thread`

Use `comments-seeded-thread` when you want a ready-made comment tree for:

- comment card layout
- reply depth
- sort and pagination
- page metrics and page feedback counters

### `captcha-always`

Use `comments-captcha-always` when you only want to inspect captcha UI.

This is the primary path for testing:

- captcha styling
- challenge placement
- verify success state
- error message layout

You do not need to edit backend config to keep captcha visible. Push the runtime scenario instead:

```bash
pnpm qingyan:scenario -- --name comments-captcha-always --page-key post:always-demo --page-title "Always Demo" --page-url /posts/always-demo/
```

### `threshold-next-write`

Use `comments-threshold-next-write` to validate the real flow:

1. `GET /api/comments/bootstrap`
2. first write returns `COMMENT_CAPTCHA_REQUIRED` or `VOTE_CAPTCHA_REQUIRED`
3. `GET /api/comments/captcha/state`
4. `POST /api/comments/captcha/verify`
5. retry the original write

Always let the page bootstrap first so the `qingyan_visitor` cookie exists before the write fails.

### `empty-thread`

Use a fresh page key plus `pnpm qingyan:reset` to validate empty-state UI:

```bash
pnpm qingyan:reset -- --page-key post:empty-demo
```

Then open the matching page and confirm:

- empty-state copy
- composer default state
- layout stability when there are no comments

### `blacklisted-after-failures`

Start from a captcha-enabled page, intentionally fail verification, then inspect the state and UI error branch:

```bash
pnpm qingyan:scenario -- --name comments-captcha-always --page-key post:blacklist-demo
pnpm qingyan:state -- --page-key post:blacklist-demo
```

In the browser:

1. submit invalid captcha values until the backend blocks the visitor
2. confirm the UI shows the expected blocked state
3. re-check state if you need to confirm captcha status or visitor context

## Full Real Integration Pass

Run the full sweep in this order:

1. `comments-seeded-thread`
2. `comments-captcha-always`
3. `comments-threshold-next-write`
4. invalid captcha until blacklisted
5. reset a fresh page key and verify the empty thread UI
6. comment vote / page like / duplicate behavior

The sweep is only considered complete when the browser UI behaves correctly through the normal `/api` routes.
