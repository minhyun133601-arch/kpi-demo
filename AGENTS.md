# AGENTS.md

Date: `2026-04-26`
Status: authority document
Scope: AI work rules for the KPI demo repository

This file is the only standing authority document for this repository. It defines how an AI agent should work in this codebase, how documentation should be written, and what must be checked before the repository is shared as a portfolio project.

## Authority Boundary

- `AGENTS.md` is the only authority document for AI behavior, repository rules, privacy rules, architecture boundaries, and verification gates.
- The owner-console Repository Map is the single portfolio-facing place for the folder map, change history, plain-language explanation, privacy notes, and verification context.
- Old standalone rule, patch-log, and companion-document names are historical references only. Current rules must be absorbed into `AGENTS.md`; portfolio-facing structure and history must be absorbed into the Repository Map.
- Do not create parallel authority documents. If a new rule is needed, add it to `AGENTS.md`.

## Repository Purpose

This repository is a public-safe KPI demo dashboard for a manufacturing operations portfolio.

The repository must not contain private organization data, client data, personal names, real plant/site names, real equipment names, internal screenshots with unredacted values, original logos, private research notes, non-demo planning notes, or material tied to a real organization outside the public demo.

Use synthetic labels and dummy values only.

Public naming should use `KPI Demo` for the project and `KPI Demo Runtime` for the Node runtime surface.

## Documentation Language

- Repository-owned documentation must be written in English by default.
- User-facing explanations in chat may be Korean, but committed markdown should be English unless the user explicitly asks otherwise.
- The Repository Map must support English and Korean viewing modes for portfolio-facing structure, change history, plain-language notes, privacy notes, and verification context.
- Do not create additional long-lived rules, checklist, prompt, or handoff markdown files unless the user explicitly asks.

## Local Port Rules

- Keep the public static portfolio demo on port `5500`.
- Keep the optional KPI Demo Runtime Node server on port `3104`.
- Keep the local PostgreSQL database used by the runtime on port `5400`.
- Keep the local operations console default and owner-console embed target on port `3215`.
- Do not reintroduce old active defaults such as runtime port `3100` or PostgreSQL port `5434` in commands, runtime configuration, examples, smoke checks, or active documentation. Historical change-history references may remain when clearly marked as history.
- If the user explicitly asks for a future port change, update the affected commands, runtime config, deploy examples, smoke checks, README, and Repository Map in the same patch.

## Privacy Rules

The agent must remove or generalize:

- real organization names
- real client names
- real employee names
- real plant, branch, factory, or site labels
- real equipment names
- real production, utility, inspection, billing, or maintenance values
- non-demo platform links, private planning notes, or source material unrelated to the demo
- internal logos, screenshots, attachments, and evidence files

Preferred replacements:

- `Demo Organization`
- `Demo Partner`
- `Demo Client A`
- `Plant A`
- `Plant B`
- `Line Alpha`
- `Process Alpha`
- `Demo Boiler A`
- `Product A`
- `Operator A`
- `Sample Equipment`
- `Synthetic KPI value`

If a term is needed to explain the application domain, keep it generic. Example: use `manufacturing operations software provider`, not the name of a real vendor.

## Working Rules

- Read the relevant files before editing.
- Keep changes scoped to the user's request.
- Preserve the current folder structure unless the user asks for a restructure.
- Do not import files from another local copy without adapting them to this repository's structure, naming, tests, and privacy rules.
- When importing ideas from a server clone, local backup, old prompt, or external working copy, treat that source as reference material only. Reshape the content to this repository's paths, public-demo naming, layer boundaries, documentation rules, and verification gates before applying it.
- Do not copy another workspace's temporary folder layout, private labels, screenshots, seed data, environment files, runtime artifacts, or personal conventions into this repository.
- Do not keep broken-encoding content in repository-owned documentation.
- Do not add private data to examples, tests, screenshots, fixtures, or seed data.
- Use dummy data that is small enough to review directly in Git.

## Code Rules

- Keep UI, routing, service, repository, and storage responsibilities separate.
- Prefer small, reversible patches.
- Do not introduce broad helper modules such as `utils`, `misc`, or `common` without a clear local pattern.
- When moving or renaming served assets, update loaders, tests, and documentation in the same patch.
- When changing server-backed behavior, keep migrations, repositories, services, routes, tests, and docs aligned.

## Verification Rules

For documentation-only cleanup:

- Run a sensitive-string scan across markdown files.
- Confirm the changed markdown files can be read normally.
- Confirm old private labels, old folder labels, and retired standalone document names are not reintroduced as active rules.

For code changes under `kpi-runtime/internal-server/`:

- Run `npm run format:check`.
- Run `npm run lint`.
- Run the relevant targeted tests.
- Run broader verification when the touched area affects shared runtime behavior.
- Use the repository's declared package scripts and CI contract instead of inventing a new verification path.

For browser-visible changes:

- Verify against a real running server or an existing browser smoke test.
- For the public static demo, `python -m http.server 5500` from `KPI-Demo/` is the expected simple verification server unless the user asks for another port.
- Report any verification gap clearly.

## Repository Map History Rules

Every repository-owned documentation or code change should update the owner-console Repository Map with:

- architecture impact or touched-path summary
- date
- summary
- changed files
- privacy impact
- verification result

The Repository Map should keep the repository tree near the top. New history entries should start with the touched area when practical, then explain the summary, changed files, privacy impact, and verification.

The Korean view should mirror the same entry in plain language so a non-technical portfolio reader can understand what changed and why.

## Final Handoff

Final responses should include:

1. What changed
2. Which files changed
3. What verification ran
4. Any remaining risk or next action
