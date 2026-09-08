# Audit — `@lambdulus/frontend`

Date: 2026-09-07. Audited from `experiment/dark-ui` HEAD (`6876152`). Verified by reading `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `src/`, `.github/workflows/`, `README.md`, git log/branches/status, plus `npm outdated`, `npm audit`, `npx vitest run` (94 passed), `npx tsc --noEmit` (clean).

Supersedes the 2026-09-04 audit, which described the CRA 4 / Node 16 era. Nearly all of its P0–P1 items have since landed (Vite migration, real test suite wired into CI, Node 22, `@monaco-editor/react`, `dist`-free repo, refreshed README, `purge-pr-deployment.yml` filename fixed).

## 1. What it is

Vite 6 + React 18 + TypeScript 5 notebook UI for playing with lambda calculus (teaching at FIT CTU). Box system hosts pluggable integrations: `untyped-lambda-integration/` (expression/exercise boxes, step debugger, macros, settings), `markdown-integration/`, `empty-integration/`, plus `screens/`, `components/`, `contexts/`, `styles/`. Private package (`"private": true`, v0.1.0). The compute engine is `@lambdulus/core`, consumed via git tag (`git+https://github.com/lambdulus/core.git#v0.0.9`) — no npm registry, so Dependabot does not cover it; bumps are manual tag moves. `vite.config.ts` uses relative `base: './'` so one build serves `/`, `/staging`, and `/staging/pr/<branch>`; `outDir` stays `build` for the downstream deploy scripts.

## 2. CI/CD

Four workflows, all **dispatch-based** (this repo builds, then `curl`s a `repository_dispatch` to a downstream repo that does the actual deploy):

- `deploy-staging.yml` — push to `develop` → dispatch `deploy-staging` to `lambdulus/staging`.
- `deploy.yml` — push to `master` → dispatch `deploy` to `lambdulus/lambdulus.github.io` (production site repo; any manual gate lives downstream).
- `dispatch-pr.yml` — PR to `develop` → comment + dispatch `pr-deploy-staging` (per-PR staging previews).
- `purge-pr-deployment.yml` — PR `closed` → comment + dispatch `pr-purge-staging`.

All four run `npm ci` + `npm test` + `npm run build` (which typechecks first) on `actions/checkout@v5` + `actions/setup-node@v5`, Node 22.x, with npm cache — and `deploy` is gated on `build` success. Verified live: the run for the v5/Node-22 modernization itself went green end to end with no deprecation annotations.

Remaining CI wrinkles (all P2 or lower): the `Accept: application/vnd.github.everest-preview+json` header is long obsolete (API is GA — harmless but remove it); auth via long-lived `secrets.ACCESS_TOKEN` PAT (expiry/owner not verifiable from here); no verification of the downstream dispatch beyond curl's exit code.

## 3. Dependencies / build

- `npm audit`: **0 vulnerabilities.** `npm outdated`: every package is at the newest version its pinned range allows. The `dompurify ^3.4.14` override is still load-bearing (`monaco-editor@0.56.0` → `dompurify@3.4.14`) — keep it.
- Available majors are opt-in migrations, not warnings: React 18→19 (`createRoot`, strict effects — touches the box lifecycle), Vite 6→8, TypeScript 5→7, `react-markdown` 7→10, testing-library 14→16, jsdom 24→29, `@vitejs/plugin-react` 4→6. Each wants a dedicated upgrade pass with the suite green before/after.
- `package-lock.json` is 174 KB and healthy. Build metadata still injected via shell interpolation (`VITE_COMMIT=$(git rev-parse HEAD)`) — Unix-only, but proven working on CI checkouts, so cosmetic at most.
- Watch item: `@lambdulus/core` moves only when someone bumps the git tag. Current pin `v0.0.9` matches the sibling `core/` checkout — no drift today.

## 4. Tests — real now

94 vitest tests across 10 files, all passing; `tsc --noEmit` clean; both enforced in CI (`npm test`, plus typecheck inside `npm run build`). Coverage centers on the areas that actually regress: focus/zen/macro/theme/box-style behaviors, accent preview contract, App shell. No coverage gate and no lint gate — the suite is the gate.

## 5. Code/structure health

- 3 `console.log` calls left in `src/` (down from ~70), `TODO`/`FIXME` markers in 15 files — background noise, not rot.
- No `serviceWorker.ts`, no lint/format config (still just the editor defaults) — Prettier/eslint with a committed config remains the cheapest hygiene win.
- README is current (stack, scripts, git-tag core consumption, branch model). It says "Requires Node 20+"; CI pins 22 — no contradiction, no `engines` field either way.
- 52 local+remote branches; the `remove-*`/`refactor-*`/`tiny-lisp`/`export-types` series is still floating around. Prune what's merged before the list grows teeth.

## 6. Prioritized cleanup

1. **PAT hygiene:** confirm `ACCESS_TOKEN` owner/expiry/rotation for both downstream dispatches. (P1 — the one thing that can silently break deploys.)
2. **Opt-in major upgrades** when there's appetite: React 19 first (biggest API surface), then Vite/TS/testing stack. One migration per pass, suite green throughout. (P1, scheduled — not urgent.)
3. **Drop the `everest-preview` header** from all four dispatch curls. (P2, trivial.)
4. **Add Prettier/eslint with committed config** (and keep it out of CI until the tree is clean, or add it — tree is small enough now that day one could be green). (P2.)
5. **Prune stale branches** after confirming `develop` vs `master` divergence is intentional. (P2.)
