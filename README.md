# Lambdulus Frontend

| Environment | Pipeline (build, test, dispatch) | Site (received and deployed) |
| ----------- | -------------------------------- | ---------------------------- |
| Staging | [![Staging deploy](https://github.com/lambdulus/frontend/actions/workflows/deploy-staging.yml/badge.svg?branch=develop)](https://github.com/lambdulus/frontend/actions/workflows/deploy-staging.yml) | [![Staging site](https://github.com/lambdulus/staging/actions/workflows/deploy.yml/badge.svg)](https://github.com/lambdulus/staging/actions/workflows/deploy.yml) |
| Production | [![Production deploy](https://github.com/lambdulus/frontend/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/lambdulus/frontend/actions/workflows/deploy.yml) | [![Production site](https://github.com/lambdulus/lambdulus.github.io/actions/workflows/handle-deploy.yml/badge.svg)](https://github.com/lambdulus/lambdulus.github.io/actions/workflows/handle-deploy.yml) |

<!-- production-sync:start -->
**Production status:** 16 builds behind staging ⚠️ — [compare](https://github.com/lambdulus/frontend/compare/master...develop)
<!-- production-sync:end -->

The web notebook for playing with lambda calculus (teaching at FIT CTU).
Vite + React 18 + TypeScript. The compute engine is `@lambdulus/core`,
consumed straight from its git tag (see `package.json`, no npm registry).

Requires Node 20+.

## Available Scripts

- `npm start` - dev server with the current git date/commit stamped in
- `npm run build` - typecheck (`tsc --noEmit`) + production build to `build/`
- `npm test` - vitest suite
- `npm run preview` - serve the production build locally

## Branches and deploys

- `develop` is staging: every push builds, tests, and dispatches to the
  `lambdulus/staging` repo, which publishes to
  https://lambdulus.github.io/staging/
- Pull requests into `develop` get per-PR previews at
  `https://lambdulus.github.io/staging/pr/<branch>` (purged on close)
- `master` is production: merging `develop` builds, tests, and dispatches
  to `lambdulus/lambdulus.github.io`, which publishes to
  https://lambdulus.github.io/
- The "Production status" line under the badge table tells at a glance whether
  production serves the latest build (develop's tip, i.e. what staging
  runs). A bot (`sync-badge.yml`, on every push plus hourly) keeps it
  truthful on both branches; its commits carry `[skip ci]`.

Builds bake in `VITE_VERSION_INFO`/`VITE_COMMIT` stamps (shown in Help and
the dev console). Assets use relative URLs, so one build serves every
path above.

## Docs

- `AUDIT.md` - repo audit (2026 cleanup)
- `TODO.md` - triaged TODO list with open decisions
