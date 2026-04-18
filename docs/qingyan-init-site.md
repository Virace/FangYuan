# QingYan Init-Site Guide

## Local Development

1. Prepare a sibling `QingYan` repository next to `FangYuan`
2. Confirm `QingYan/config/qingyan.yml` or let the local workflow fall back to `config/qingyan.example.yml`
3. Run `pnpm dev:full` in `FangYuan` when you want FangYuan + QingYan local joint startup
4. Run `pnpm dev` in `FangYuan` alone when you only need the frontend and already have a reachable QingYan endpoint
5. For runtime UI scenario control, use [qingyan-dev-scenarios.md](./qingyan-dev-scenarios.md)

## `site/config.ts`

- `qingyanDevProxyTarget` is optional and should stay a string literal when enabled so `src/utils/site-source.ts` can read it statically
- `commentConfig`, `pageMetricsConfig`, and `pageFeedbackConfig` can each point at the same QingYan-owned `/api` surface
- `siteKey` should match the site registration used on the QingYan side
- `pageFeedbackConfig.rewardOptions` remains frontend-owned content and does not come from QingYan

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
