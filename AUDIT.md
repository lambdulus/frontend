# Audit — `@lambdulus/frontend`

Date: 2026-09-04. Audited from local `develop` HEAD (`8b8129e`, Oct 2022; working tree has uncommitted edits to `src/App.css` and `src/untyped-lambda-integration/Constants.ts`). Verified by reading `package.json`, `tsconfig.json`, `src/`, `public/`, `.github/workflows/`, git log/branches/status.

## 1. What it is

Create-React-App 4 notebook UI for playing with lambda calculus (teaching at FIT CTU). Box system (`components/Box*.tsx`, `CreateBox`, `PickBoxTypeModal`) hosts pluggable integrations: `untyped-lambda-integration/` (expression/exercise boxes, step debugger, macros, settings), `markdown-integration/` (notes), `empty-integration/`, plus `screens/` (Notebook, Settings, Help), `contexts/` (Settings, Theme), `misc/UserGuide.ts`. ~45 TS/TSX files, `react-monaco-editor` editing, `react-markdown` notes. Private package (`"private": true`, v0.1.0).

## 2. CI/CD — your recollection is mostly right, with one correction

There are 4 workflows, all **dispatch-based** (this repo never publishes to GitHub Pages itself; it builds, then `curl`s a `repository_dispatch` to a *downstream* repo that does the actual deploy):

- `deploy.yml` — on `push` to `master`: build, then `POST /repos/lambdulus/lambdulus.github.io/dispatches` with `event_type: deploy`. This is the **production** path (production site repo).
- `deploy-staging.yml` — on `push` to `develop`: build, then dispatch `deploy-staging` to `lambdulus/staging`. This is the **staging** path.
- `dispatch-pr.yml` — on `pull_request` to `develop`: posts a comment ("will soon be deployed to `https://lambdulus.github.io/staging/pr/<branch>`…") and dispatches `pr-deploy-staging` (with branch name) to `lambdulus/staging`. Per-PR staging previews.
- `purge-pr-deployement.yml` (sic, typo in filename) — on PR `closed`: posts a "will shortly be purged" comment and dispatches `pr-purge-staging` to `lambdulus/staging`.

So: staging deploys are automatic (push to `develop`, PR open/close); production deploys fire automatically on push to `master` **from this repo's side**. The manual step you remember ("run the production deploy manually from GH website") is not in this repo — it must live in the downstream `lambdulus.github.io` repo (e.g. a manual `workflow_dispatch`/approval gate there). Worth confirming there before touching `deploy.yml`.

Common CI weaknesses across all four: `actions/checkout@v2` + `actions/setup-node@v2` (both EOL), Node `16.x` (EOL since 2023), `npm ci` + `npm run build` with **`npm test` commented out**, deprecated `Accept: application/vnd.github.everest-preview+json` header, auth via `secrets.ACCESS_TOKEN` (a long-lived PAT — check expiry/owner), no verification that the downstream dispatch succeeded beyond curl's exit code.

## 3. Dependencies / build

- `react-scripts 4.0.3` (CRA 4), `react`/`react-dom 17`, `typescript ^4.4.4`, `@lambdulus/core ^0.0.8` (npm registry — i.e. frontend does **not** consume the sibling `core/` checkout), `react-monaco-editor ^0.45.0`, `react-markdown ^7.1.0`, `pretty-checkbox[-react]`, testing-library stack, `@types/react 17`, `@types/node 16`. `package-lock.json` is 1.5 MB; `npm ls` health not verified here.
- Everything material is EOL/unmaintained: CRA 4 (no updates since 2021; CRA itself deprecated), React 17 (current is 19; 18+ changes `createRoot`, strict effects), Node 16 types, `react-monaco-editor` (abandoned; monaco + React 18 needs `@monaco-editor/react`), TS 4.4 (`tsconfig` still targets `es5` with `isolatedModules`, `noFallthroughCasesInSwitch` — fine but dated).
- Scripts inject build metadata via shell interpolation (`REACT_APP_VERSION_INFO=$(date …) REACT_APP_COMMIT=$(git rev-parse HEAD)`) — Unix-only, breaks on Windows, and `git rev-parse` fails on shallow/tagless CI checkouts. `test` is bare `react-scripts test` (watch mode; needs `CI=true` in automation — currently moot since tests are disabled in CI). No `homepage` field and no `gh-pages` dependency, consistent with the dispatch-to-downstream deploy model (§2).
- Dependabot bump PRs exist on remote (`async`, `eventsource`, `follow-redirects`, `minimist`, `nanoid`, `terser`, `url-parse` — several are **security** fixes) but were never merged; the `update-deps` branch is stale too.

## 4. Tests — effectively none

- The only test file is `src/App.test.tsx`, still the CRA template: it renders `<App />` and asserts on `/learn react/i`, which does not exist in the real app — i.e. it fails (or would, if it ran). All workflows have `# - run: npm test` commented out, so nothing runs it.
- 73 `console.log` calls across `src/`, ~40 `TODO/FIXME` comments (dead-code markers, "just for now" F9 shortcuts, Czech notes like `tohle bude chtít přepsat`), commented-out `github-token` in `dispatch-pr.yml`, and uncommitted local edits (`App.css`, `Constants.ts`) sitting in the working tree.
- No lint gate in CI (only CRA's in-dev eslint), no Prettier/format config, no coverage.

## 5. Code/structure health

- Clean separation of integrations is a strength; the Box/context refactor series (#52, #55) landed, so state flows through contexts rather than prop-drilling. But many stale remote branches (`tiny-lisp`, `remove-*`, `refactor-*`, `export-types`, …) suggest half-finished migrations still floating around — check whether `develop` vs `master` have diverged meaningfully before deleting.
- `serviceWorker.ts` is present (CRA default) — confirm whether offline support is actually wanted; an unmaintained SW + teaching tool is a stale-cache footgun.
- `public/` icons/manifest look fine; `README.md` is the CRA stub plus two deploy sentences (the "open a merge request into master" line predates the current dispatch setup — update it).

## 6. Prioritized cleanup

1. **Triage deploy config before any upgrade:** confirm the downstream `lambdulus.github.io` / `staging` repos' expected events and the manual production gate; rotate/verify `ACCESS_TOKEN`; fix the `purge-pr-deployement.yml` typo by renaming (keep a compat shim if the downstream matches on filenames — it shouldn't, events matter, but check). (P0 — deploy is the one thing that must keep working.)
2. **Decide the frontend's future stack, then patch security in the meantime:** merge or re-issue the Dependabot security bumps; then choose stay-on-CRA (upgrade to latest `react-scripts` 5 + React 18, minimal churn) vs. migrate to Vite/Next (bigger win, bigger diff). Either way, replace `react-monaco-editor` with `@monaco-editor/react` and lift Node to 20/22 in CI. (P0 security, P1 stack.)
3. **Make `npm test` real and run it in CI:** delete or rewrite `App.test.tsx` into a smoke test of the actual App, add integration tests for at least parse→render→step in the untyped-lambda boxes, uncomment/enable `npm test -- --watchAll=false` in all workflows. (P1 — teaching tool with zero tests.)
4. **Modernize workflows:** `checkout@v4` + `setup-node@v4`, `node-version: [20.x]` (or 22.x), cache `npm`, `CI=true`, fail loudly on dispatch errors (`curl --fail`), replace `everest-preview` header, make build-metadata injection cross-platform (e.g. `REACT_APP_COMMIT=$GITHUB_SHA`). (P1.)
5. **Hygiene:** commit or stash the two dirty files; remove `serviceWorker.ts` if unused; run Prettier/eslint with a committed config; refresh README (branch model `develop`→staging auto / `master`→production dispatch + downstream manual gate, scripts, Node version); prune merged/stale branches. (P2.)
