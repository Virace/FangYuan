# QingYan Init-Site Guide

## Local Development

1. Prepare a sibling `QingYan` repository next to `FangYuan`
2. Confirm `QingYan/config/qingyan.yml` or let the local workflow fall back to `config/qingyan.example.yml`
3. Run `pnpm dev:full` in `FangYuan` when you want FangYuan + QingYan local joint startup
4. Run `pnpm dev` in `FangYuan` alone when you only need the frontend and already have a reachable QingYan endpoint
5. Run `pnpm dev:mock` when you want the built-in QingYan simulator instead of a real backend

## `site/config.ts`

- `qingyanDevProxyTarget` is optional and should stay a string literal when enabled so `src/utils/site-source.ts` can read it statically
- `qingyanDevProxyTarget = "mock"` enables the built-in QingYan simulator for browser-side UI testing without a real QingYan process
- `commentConfig`, `pageMetricsConfig`, and `pageFeedbackConfig` can each point at the same QingYan-owned `/api` surface
- `siteKey` should match the site registration used on the QingYan side
- `pageFeedbackConfig.rewardOptions` remains frontend-owned content and does not come from QingYan

### Built-in Mock Notes

- The built-in mock serves the same `/api/comments/*` and `/api/page-feedback/like` routes used by the browser client
- It keeps a same-origin `qingyan_visitor` cookie so captcha/state/verify/write requests follow the same session rules as QingYan docs
- Startup flags are available through `pnpm dev:mock -- <flags>` and map to environment-backed defaults before the first request seeds page state
- Default mock behavior is:
  - seeded comments are available for comment card / nested layout testing
  - captcha mode is `threshold`
  - the first write action triggers captcha
  - two wrong captcha submissions blacklist the current visitor temporarily
  - seeded root comment `c_<pageKey>_root_1` always triggers captcha on vote
  - seeded root comment `c_<pageKey>_root_2` always returns a fake blacklist response on vote for frontend prompt testing
- Common startup examples:
  - `pnpm dev:mock -- --captcha always`
  - `pnpm dev:mock -- --seed dense --comment-count 12 --page-views 256 --like-count 18`
  - `pnpm dev:mock -- --threshold 2 --ban-after 1 --answer 1357`
- You can override behavior per page through the page URL query string:
  - `qingyanMockCaptcha=always|threshold|never`
  - `qingyanMockThreshold=1`
  - `qingyanMockBanAfter=2`
  - `qingyanMockBanTtl=300`
  - `qingyanMockCommentCount=12`
  - `qingyanMockPageViews=256`
  - `qingyanMockLikeCount=18`
  - `qingyanMockSeed=empty`
  - `qingyanMockAnswer=2468`

## `init-site`

- `node scripts/init-site.js` is intended for fresh-site bootstrap
- `node scripts/init-site.js --dry-run` should walk through the same questions but only print planned mkdir / copy / write actions without touching the filesystem
- The scaffold should create a buildable `site/` skeleton, seed a welcome post only for empty sites, and preserve existing non-empty `site/` trees
- Interactive answers should cover site title, subtitle, profile basics, QingYan site key, optional local proxy target, and enable flags for comments / page metrics / page feedback

## Production

- Deploy QingYan separately from FangYuan
- Prefer keeping FangYuan `apiBase` on a same-origin reverse-proxy surface such as `/api`
- Keep `site/config.ts` simple and explicit; avoid dynamic config patterns that break the current static loaders
- Treat `site/` as user-owned content/config input rather than repo demo baseline
