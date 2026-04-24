# KPI Demo

Portfolio-safe KPI management demo for manufacturing operations.

This repository is prepared as a public demo. It keeps the application structure, runtime modules, and PostgreSQL-capable server code, but the static demo data is synthetic and does not include private company records.

## Data Mode

- Public demo: uses synthetic JS fixtures from `kpi-runtime/demo/KPI.demo-data.js`.
- Runtime server: remains under `kpi-runtime/internal-server` for the PostgreSQL-backed version.
- Production version can persist to PostgreSQL; public demo uses synthetic fixtures.

## Run Static Demo

From this folder:

```powershell
python -m http.server 5500
```

Open:

```text
http://localhost:5500/KPI.html
```

Windows shortcut commands:

```text
commands\open-kpi-demo.cmd
commands\close-kpi-demo.cmd
```

## Local Ports

- Static portfolio demo: `http://127.0.0.1:5500/KPI.html`
- Optional Node runtime login: `http://127.0.0.1:3100/login`
- Optional PostgreSQL runtime database: `127.0.0.1:5434`
- Optional command console: `http://127.0.0.1:3215` with fallback ports `3216`-`3218`

Optional runtime demo login:

```text
ID: 1234
Password: 1234
```

## Run Optional Runtime Tools

The optional runtime can use an installed PostgreSQL 15-17, `KPI_POSTGRES_BIN_DIR`, or the repository-local portable PostgreSQL tools under `kpi-runtime/internal-server/var/tools/`. The portable tools are ignored by Git and are downloaded only when needed by the Windows runtime scripts.

Initialize PostgreSQL, seed the demo owner, and start the Node runtime:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\kpi-runtime\internal-server\scripts\windows\initialize-central-runtime.ps1 -StartServer -BootstrapOwner
```

Open the local command console:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\commands\ops-console-app\scripts\start-ops-console.ps1
```

The command console should report this repository under `commandsRoot`, PostgreSQL ready on port `5434`, and the sample owner account `1234 / 1234`.

## Public Portfolio Notes

- Company names, private site labels, and personal names have been replaced with public-safe demo labels.
- Team, process, equipment, and product labels use synthetic names such as `Line Alpha`, `Process Alpha`, `Demo Boiler A`, and `Product A`.
- Screenshots for external submission should use synthetic or edited data only.
- The demo company name is fictional: `Aster Demo Manufacturing`.
- The public logo is a generic demo SVG at `shared-assets/kpi-demo-logo.svg`; original or employer logos must not be committed.
