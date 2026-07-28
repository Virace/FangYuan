
# Contributing

Thank you for your interest in contributing!

FangYuan is an open-source Astro theme derived from Fuwari and maintained as an independent project. The repository is public, but it is still primarily maintained as a small personal project, so focused changes are easier to review than broad redesigns.

## Before You Start

If you plan to make major changes (especially new features or design changes), please open an issue or discussion before starting work. This helps ensure your effort aligns with the project's direction.

## Submitting Code

Please keep each pull request focused on a single purpose. Avoid mixing unrelated changes in one PR, as this can make reviewing and merging code more difficult.

Please use the [Conventional Commits](https://www.conventionalcommits.org/) format for your commit messages whenever possible. This keeps our history clear and consistent.

Use `develop` as the normal integration target. `main` is reserved for release-ready state.

Before submitting code, run the checks that match your change:

```bash
pnpm check
pnpm type-check
pnpm check:svelte
pnpm lint
pnpm build
```

For behavior changes, also run the relevant Node or Playwright tests. `pnpm test:node` runs the fast Node unit suite with the test runner's default file-level concurrency. Use `pnpm test:build` only when the change touches build integration behavior. It prepares five successful artifacts and three expected failures with isolated output/cache directories, reuses each successful artifact across its assertions, and serializes only artifact preparation because Astro still writes a shared generated `.astro/` directory. Font assets come from the installed `@fontsource` packages through Astro's local provider, so builds must not depend on CDN access or a prewarmed download cache.

If `pnpm lint` reports fixable Biome diagnostics, run:

```bash
pnpm format
pnpm lint
```
