# AGENTS.md

Date: `2026-04-24`
Status: authority document
Scope: AI work rules for the KPI demo repository

This file is the only standing authority document for this repository. It defines how an AI agent should work in this codebase, how documentation should be written, and what must be checked before the repository is shared as a portfolio project.

## Authority Boundary

- `AGENTS.md` is the only authority document for AI behavior, repository rules, privacy rules, architecture boundaries, and verification gates.
- `patch.md` is supporting material only. It records what changed, which architecture area was touched, and how the change was verified.
- `plain-english-companion.md` is supporting material only. It explains the patch history in simple Korean for non-technical portfolio readers.
- Old document names such as `agent.md` or `비전공자용.md` are historical references only. Current rules must be absorbed into `AGENTS.md`, `patch.md`, and `plain-english-companion.md`.
- Do not create parallel authority documents. If a new rule is needed, add it to `AGENTS.md`.

## Repository Purpose

This repository is a public-safe KPI demo dashboard for a manufacturing operations portfolio.

The repository must not contain private employer data, client data, personal names, real plant/site names, real equipment names, internal screenshots with unredacted values, original logos, private research notes, or job-application research for a specific target company.

Use synthetic labels and dummy values only.

Public naming should use `KPI Demo` for the project and `KPI Demo Runtime` for the Node runtime surface.

## Documentation Language

- Repository-owned documentation must be written in English by default.
- User-facing explanations in chat may be Korean, but committed markdown should be English unless the user explicitly asks otherwise.
- `patch.md` is the technical change log.
- `plain-english-companion.md` is the non-technical companion document for portfolio readers. Its language may follow the user's requested audience.
- Do not create additional long-lived rules, checklist, prompt, or handoff markdown files unless the user explicitly asks.

## Privacy Rules

The agent must remove or generalize:

- real company names
- real client names
- real employee names
- real plant, branch, factory, or site labels
- real equipment names
- real production, utility, inspection, billing, or maintenance values
- recruitment-platform links and single-company application material
- internal logos, screenshots, attachments, and evidence files

Preferred replacements:

- `Target Company`
- `Previous Employer`
- `Client A`
- `Plant A`
- `Plant B`
- `Line Alpha`
- `Process Alpha`
- `Demo Boiler A`
- `Product A`
- `Operator A`
- `Sample Equipment`
- `Synthetic KPI value`

If a term is needed to explain the application domain, keep it generic. Example: use `manufacturing AX provider`, not the name of a real vendor.

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
- Confirm old private labels, old folder labels, and removed document names are not reintroduced as active rules.

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

## Patch Log Rules

Every repository-owned documentation or code change should update `patch.md` with:

- architecture impact or touched-path summary
- date
- summary
- changed files
- privacy impact
- verification result

`plain-english-companion.md` should mirror the same entry in simple language so a non-technical reader can understand what changed and why.

`patch.md` should keep a repository tree near the top. New entries should start with the touched area when practical, then explain the summary, changed files, privacy impact, and verification.

`plain-english-companion.md` should keep the same repository tree in simple Korean. New entries should begin with "이번에 건드린 위치" or an equivalent plain-language location summary.

## Final Handoff

Final responses should include:

1. What changed
2. Which files changed
3. What verification ran
4. Any remaining risk or next action
