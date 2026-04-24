# patch.md

Date: `2026-04-24`
Status: supporting technical change log
Authority reference: `AGENTS.md`

This file records technical changes in English. It is not an authority document. The rules live in `AGENTS.md`.

## Repository Documentation Policy

- All standing repository documentation should be English.
- `AGENTS.md` owns AI and repository rules.
- `patch.md` records technical change history.
- `plain-english-companion.md` explains the change log in simple language for non-technical readers.
- Public portfolio documentation must not include real company names, client names, employee names, real site labels, internal data, recruitment links, or single-company application research.

## Architecture First

### Current Repository Tree

```text
KPI-Demo/
|-- AGENTS.md                 AI and repository rules
|-- patch.md                  technical change log
|-- plain-english-companion.md non-technical explanation of the change log
|-- KPI.html                  main KPI dashboard shell
|-- kpi-runtime/              shared shell and Node/PostgreSQL runtime
|-- utility/                  utility metering, reporting, and production tools
|-- team-report/              team work log and work history UI
|-- audit/                    audit record UI
|-- data-entry/               data entry sections
|-- commands/                 local helper commands
`-- shared-assets/            public-safe placeholder assets
```

## 2026-04-25 - Public Demo Team And Process Label Sanitization

### Architecture Impact

```text
KPI-Demo/
|-- README.md
|-- AGENTS.md
|-- kpi-runtime/demo/
|-- kpi-runtime/internal-server/test/
|-- team-report/runtime/work/
|-- utility/apps/metering/
|-- utility/apps/production-extractor/
|-- utility/runtime/util/
|-- patch.md
`-- plain-english-companion.md
```

### Summary

- Replaced internal-style numbered team and part labels with public demo names such as `Line Alpha`, `Line Beta`, `Line Gamma`, and `Line Delta`.
- Replaced process, equipment, and product labels with synthetic names such as `Process Alpha`, `Demo Boiler A`, and `Product A`.
- Updated production import parsing, utility metering normalization, report formatting, chart models, and smoke tests so the demo behavior matches the new public labels.
- Added README and AGENTS guidance so future fixtures, screenshots, and tests keep using synthetic labels.
- Added `node_modules/` and local AI-tool metadata ignore rules before publishing the standalone public demo repository.

### Changed Files

- `README.md`
- `AGENTS.md`
- `.gitignore`
- `kpi-runtime/demo/KPI.demo-data.js`
- `kpi-runtime/internal-server/test/frontend/**`
- `kpi-runtime/internal-server/test/scripts/**`
- `team-report/runtime/work/**`
- `utility/apps/metering/**`
- `utility/apps/production-extractor/**`
- `utility/runtime/util/**`
- `patch.md`
- `plain-english-companion.md`

### Privacy Impact

- Removed Korean team, part, process, equipment, and internal product-code labels from active demo source and tests.
- The demo now presents organization, process, equipment, and product labels as synthetic portfolio-safe examples.

### Verification

- Sensitive-string scans passed for old company labels, team labels, process labels, equipment labels, and internal product-code labels.
- JS syntax checks passed for the main changed runtime files.
- Targeted frontend smoke tests passed: `47` tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm test`: passed, `425` tests.
- Static browser smoke passed at `http://127.0.0.1:5500/KPI.html`: no console errors and no forbidden old labels in visible text, including shadow DOM text.

## 2026-04-25 - Public Demo Logo Replacement

### Architecture Impact

```text
KPI-Demo/
|-- KPI.html
|-- README.md
|-- shared-assets/
|   `-- kpi-demo-logo.svg
|-- kpi-runtime/
|   |-- app/
|   `-- internal-server/src/
|-- team-report/runtime/work/history/
`-- utility/apps/metering/
```

### Summary

- Replaced all browser-visible logo references with the generic public demo logo `shared-assets/kpi-demo-logo.svg`.
- Removed the old binary logo files from the repository.
- Updated the Node runtime public static asset allowlist and smoke check to use the SVG demo logo instead of `favicon.ico`.
- Added a README note that original or employer logos must not be committed.

### Changed Files

- `KPI.html`
- `README.md`
- `shared-assets/kpi-demo-logo.svg`
- `kpi-runtime/app/KPI.app.js`
- `kpi-runtime/app/KPI.app.shared.js`
- `kpi-runtime/app/KPI.app.navigation.js`
- `kpi-runtime/internal-server/src/lib/kpi-static.js`
- `kpi-runtime/internal-server/src/routes/kpi-routes.js`
- `kpi-runtime/internal-server/src/scripts/verifyKpiRootStatic.js`
- `team-report/runtime/work/history/KPI.work.history.view.layout.js`
- `utility/apps/metering/template.js`
- `patch.md`
- `plain-english-companion.md`

### Removed Files

- `shared-assets/logo.jpg`
- `utility/apps/metering/metering-logo.png`
- `favicon.ico`

### Privacy Impact

- Removed remaining original logo image assets and old logo alt text from active code.
- The only committed image asset is now a synthetic SVG logo created for the public demo.
- Sensitive-string scans found no matches for removed company, site, department, or old conduct-code labels.

### Verification

- JS syntax checks passed for changed runtime and template files.
- Static demo HTTP checks passed: `KPI.html` returned `200`, and `shared-assets/kpi-demo-logo.svg` returned `200 image/svg+xml` on port `5500`.
- Image asset scan passed: the only remaining image asset is `shared-assets/kpi-demo-logo.svg`.
- Active-code old logo scan passed outside documentation history; no references remain to old favicon, metering logo, original logo path, or old company logo alt text.
- Sensitive-string scan across `KPI-Demo`: passed; no matches for removed company, site, recruitment-platform, internal department, or old conduct-code labels.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- Targeted frontend/server-structure/login tests passed: `11` tests.
- `npm test`: passed, `425` tests.

## 2026-04-25 - Server Documentation Rules Adapted To KPI Demo

### Architecture Impact

```text
KPI-Demo/
|-- AGENTS.md                  authority rules updated
|-- patch.md                   technical change log updated
`-- plain-english-companion.md non-technical companion updated
```

### Summary

- Reviewed the legacy server-side documentation rules available from the git history.
- Adapted the useful rules into the current public-demo documentation model instead of copying old files directly.
- Added an explicit authority boundary: `AGENTS.md` is the only authority document, while `patch.md` and `plain-english-companion.md` remain supporting documents.
- Added rules for importing content from another server clone or local copy: use it as reference material, reshape it to `KPI-Demo`, and do not bring private labels, temporary layouts, runtime artifacts, or personal conventions into the public demo.
- Strengthened patch-history rules so future entries include architecture impact or touched-path context.
- Kept the former `비전공자용.md` role under the public-safe filename `plain-english-companion.md`.

### Changed Files

- `AGENTS.md`
- `patch.md`
- `plain-english-companion.md`

### Privacy Impact

- No private company, site, person, screenshot, or operational data was imported.
- Legacy server documentation was treated as reference material only and rewritten for the public `KPI-Demo` repository.

### Verification

- Sensitive-string scan across markdown files: passed; no matches for removed company, old site, recruitment-platform, or internal department labels.
- UTF-8 read check passed for `AGENTS.md`, `patch.md`, and `plain-english-companion.md`.
- Rule-presence scan passed for `Authority Boundary`, `Architecture First`, server-clone import rules, and the companion `이번에 건드린 위치` section.
- Old server/reference folder names were not reintroduced into the active public documentation.

## 2026-04-25 - Demo Commands And Sample Login

### Architecture Impact

```text
KPI-Demo/
|-- README.md
|-- .gitignore
|-- commands/
|   |-- open-kpi-demo.cmd
|   |-- close-kpi-demo.cmd
|   |-- start-kpi-demo-static.ps1
|   |-- stop-kpi-demo-static.ps1
|   `-- ops-console-app/
|       |-- scripts/
|       `-- ops-console/
|           |-- lib/
|           `-- public/
`-- kpi-runtime/internal-server/
    |-- scripts/windows/
    |-- src/routes/auth-routes.js
    `-- test/routes/auth-routes-login-page.test.js
```

### Summary

- Added simple Windows commands for the public static demo: `commands/open-kpi-demo.cmd` and `commands/close-kpi-demo.cmd`.
- Standardized local portfolio ports in documentation and command output: static demo `5500`, optional Node runtime `3100`, optional PostgreSQL `5434`, and command console `3215` with fallback ports `3216`-`3218`.
- Updated the optional runtime login page so first-time viewers can see and submit the sample credentials `1234 / 1234`.
- Updated the Windows runtime bootstrap path so the default demo owner account is `1234 / 1234`.
- Updated the command console labels and account form defaults to match the public demo naming.
- Ignored generated command runtime state under `commands/var/`.

### Changed Files

- `.gitignore`
- `README.md`
- `commands/open-kpi-demo.cmd`
- `commands/close-kpi-demo.cmd`
- `commands/start-kpi-demo-static.ps1`
- `commands/stop-kpi-demo-static.ps1`
- `commands/open-ops-console.cmd`
- `commands/close-ops-console.cmd`
- `commands/ops-console-app/scripts/start-ops-console.ps1`
- `commands/ops-console-app/scripts/stop-ops-console.ps1`
- `commands/ops-console-app/ops-console/lib/command-registry.mjs`
- `commands/ops-console-app/ops-console/lib/ops-service.mjs`
- `commands/ops-console-app/ops-console/public/index.html`
- `commands/ops-console-app/ops-console/public/app.js`
- `kpi-runtime/internal-server/scripts/windows/initialize-central-runtime.ps1`
- `kpi-runtime/internal-server/scripts/windows/start-central-stack.ps1`
- `kpi-runtime/internal-server/src/routes/auth-routes.js`
- `kpi-runtime/internal-server/test/routes/auth-routes-login-page.test.js`
- `patch.md`
- `plain-english-companion.md`

### Privacy Impact

- The sample login is intentionally fake demo data and does not represent a real user account.
- No private company, site, person, screenshot, or operational data was added.

### Verification

- JS syntax checks passed for the changed route and command-console modules.
- `commands/start-kpi-demo-static.ps1` recognized the existing static demo server and confirmed `http://127.0.0.1:5500/KPI.html`.
- Static demo HTTP check returned `200` on port `5500`.
- New login-page test passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- Targeted login-page and server-structure tests passed: `7` tests.
- `npm test`: passed, `425` tests.
- Sensitive-string scan across `KPI-Demo`: passed; no matches for removed company, old site, recruitment-platform, or internal department labels.

## 2026-04-24 - Public Documentation Sanitization

### Summary

- Rewrote repository-owned documentation into English.
- Replaced the previous non-technical Korean companion document with a plain-English companion.
- Replaced broken-encoding documentation content with clean, readable markdown.
- Removed single-company application research and target-company prompt material from the root documentation files.
- Removed real company and site labels from the remaining markdown.
- Added explicit public-portfolio privacy rules to `AGENTS.md`.

### Changed Files

- `KPI-Demo/AGENTS.md`
- `KPI-Demo/patch.md`
- `KPI-Demo/plain-english-companion.md`
- `agent.md`
- `deep-research-report.md`

### Privacy Impact

- Specific employer, target-company, client, recruitment-platform, and real site references were removed or generalized.
- Public-safe replacements now use generic terms such as `Target Company`, `Previous Employer`, `Client A`, `Plant A`, `Plant B`, and `Operator A`.

### Verification

- Sensitive-string scan across markdown files: passed; no matches for the removed private company, site, recruitment-platform, or personal-name patterns.
- Markdown file list checked: only five markdown files are in this workspace.

## 2026-04-24 - Runtime Label Sanitization And Demo Naming

### Summary

- Replaced remaining runtime, fixture, and test labels that pointed to real site or person names.
- Renamed public-facing site examples to `Plant A`, `Plant B`, and operator examples to `Operator A` style labels.
- Renamed the Plant B team-overview card file and smoke test from the old site-specific filename to the public-safe `plantB` filename.
- Updated the Node runtime package, service label, logs, workflow name, and task labels to `kpi-demo-runtime`/`KPI Demo Runtime`.

### Changed Files

- Runtime source under `utility/`, `team-report/`, and `kpi-runtime/internal-server/src/`
- Frontend and migration smoke tests under `kpi-runtime/internal-server/test/`
- `kpi-runtime/internal-server/package.json`
- `kpi-runtime/internal-server/package-lock.json`
- `.github/workflows/kpi-demo-runtime-ci.yml`
- `plain-english-companion.md`
- `utility/apps/metering/team-overview/plantB-card.js`
- `kpi-runtime/internal-server/test/frontend/metering-team-overview-plantB-card.smoke.js`

### Privacy Impact

- Removed remaining real site labels and real person-name patterns from code, tests, scripts, and filenames.
- Public examples now use generic plant and operator labels only.
- The runtime is now branded as a demo runtime instead of an internal company server.

### Verification

- Sensitive-string scan across repository contents: passed; no matches for the removed company, site, recruitment-platform, or personal-name patterns.
- Filename scan across repository contents: passed; no old site or personal-name filenames remained.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- Targeted metering, report-sheet, work, and migration smoke tests: passed.
- `npm test`: passed, `424` tests.

## 2026-04-24 - Companion Document Korean Localization

### Summary

- Kept the public-safe English filename `plain-english-companion.md`.
- Rewrote the companion document body in Korean at the user's request.
- Clarified in `AGENTS.md` that the companion document language may follow the intended portfolio audience.

### Changed Files

- `plain-english-companion.md`
- `AGENTS.md`
- `patch.md`

### Privacy Impact

- No private labels or real company data were added.
- The Korean content keeps the same public-safe dummy labels and privacy guidance.

### Verification

- Sensitive-string scan across repository contents: passed; no matches for the removed company, site, recruitment-platform, or personal-name patterns.
- Filename scan across repository contents: passed; no old site or personal-name filenames remained.

## 2026-04-24 - Top-Level Folder Rename

### Summary

- Renamed the public project folder from the old server-oriented name to `KPI-Demo`.
- Moved all repository files under the new `KPI-Demo` folder.
- Removed the empty old folder after clearing read-only directory attributes.

### Changed Files

- `KPI-Demo/`
- `plain-english-companion.md`
- `patch.md`

### Privacy Impact

- The visible project folder name now matches the public demo naming used in the documentation.
- No private labels or real company data were added.

### Verification

- Confirmed the old folder no longer exists.
- Confirmed the new `KPI-Demo` folder exists.
- Sensitive-string scan across `KPI-Demo`: passed.
- Filename scan across `KPI-Demo`: passed.
- `npm run format:check`: passed from the new path.
- `npm run lint`: passed from the new path.

## 2026-04-24 - Demo Cover Policy Copy

### Summary

- Replaced the home-cover management policy and code-of-conduct copy with public demo wording.
- Changed the cover from company-specific slogans to a fictional `Aster Demo Manufacturing` operating-principle set.
- Kept the demo focused on data-based operations, AI-assisted efficiency, trust, collaboration, and continuous improvement.

### Changed Files

- `kpi-runtime/app/KPI.app.js`
- `kpi-runtime/app/KPI.app.navigation.js`
- `patch.md`

### Privacy Impact

- Removed the previous company-specific code-of-conduct title and mnemonic slogan labels.
- The cover now uses fictional demo-company wording and generic manufacturing operations values.

### Verification

- Old cover slogan scan: passed; no matches for the removed code-of-conduct title or mnemonic labels.
- New cover copy scan: passed; the expected `Aster Demo Manufacturing`, policy, and value labels are present in both home-render files.
- Targeted frontend structure tests passed: `10` tests.

## 2026-04-24 - Public Demo Synthetic Fixtures

### Summary

- Added a static demo fixture bootstrap for work calendars, work history, production, wastewater, energy, gas, and lighting audit data.
- Loaded the fixture before metering and utility synchronization scripts so the static demo opens with populated public-safe data.
- Updated the browser title and viewer brand to `KPI Demo Management Console`.
- Replaced a remaining internal department label with a generic facility-team label.
- Added a README that documents the public demo data mode and the retained PostgreSQL-capable runtime structure.

### Changed Files

- `KPI.html`
- `README.md`
- `kpi-runtime/demo/KPI.demo-data.js`
- `team-report/runtime/work/sections/KPI.sections.work.js`
- `team-report/runtime/work/history/KPI.work.history.core.js`
- `team-report/runtime/work/history/KPI.work.history.view.layout.js`
- `patch.md`

### Privacy Impact

- The fixture uses only fictional company, site, operator, product, and operations labels.
- The public static demo remains JS fixture based; the server runtime can still support PostgreSQL persistence for a production version.

### Verification

- Demo fixture syntax check passed with `node --check`.
- Sensitive-string scan across `KPI-Demo`: passed; no matches for removed company, old cover slogans, old site label, or internal department label.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- Targeted frontend/server-structure tests passed: `10` tests.
- `npm test`: passed, `424` tests.
- Static server smoke check passed at `http://localhost:5500/KPI.html`; title, demo fixture injection, local store, and console-error checks passed.
