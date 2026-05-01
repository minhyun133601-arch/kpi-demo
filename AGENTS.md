# AGENTS.md

작성일 / Date: `2026-04-26`
개정일 / Revised: `2026-05-02` — `KPI-Server` / `KPI-local` 참고 경계와 directive 규격 반영

> 이 문서는 `KPI Demo` 저장소의 **AI 역할, 공개 안전 기준, 참조 저장소 흡수 규칙, 코드 규칙, 검증 완료 기준**을 정의하는 단일 기준 문서다.
> This document is the single source of truth for the `KPI Demo` repository's **AI role, public-safety rules, reference-repository absorption rules, code rules, and verification gates**.

## Boundary Header / 경계 헤더

```yaml
authority_doc: true
doc_name: "AGENTS.md"
doc_scope: "AI role, public demo rules, reference absorption, code rules, verification rules / AI 역할, 공개 데모 규칙, 참조 흡수, 코드 규칙, 검증 규칙"
owns:
  - "AI working behavior / AI 작업 방식"
  - "KPI Demo public-safety and privacy rules / KPI Demo 공개 안전·개인정보 보호 규칙"
  - "KPI-Server and KPI-local reference boundaries / KPI-Server와 KPI-local 참고 경계"
  - "coding rules and architecture boundaries / 코딩 규칙과 아키텍처 경계"
  - "testing, lint, browser verification, and done gates / 테스트·린트·브라우저 검증·완료 게이트"
  - "repo documentation language policy / 저장소 문서 언어 정책"
  - "Repository Map change-history requirements / Repository Map 변경 이력 기준"
not_own:
  - "live server rollout or production operation / 실서버 배포 또는 운영"
  - "network ACL, firewall, DNS, Caddy, cloudflared, reverse proxy exposure decisions / 네트워크 ACL·방화벽·DNS·Caddy·cloudflared·리버스 프록시 노출 결정"
  - "private organization data, credentials, runtime artifacts, or internal screenshots / 비공개 조직 데이터·자격 증명·런타임 산출물·내부 스크린샷"
  - "rules for changing KPI-Server or KPI-local themselves unless explicitly requested / 명시 요청 없는 KPI-Server 또는 KPI-local 자체 변경 규칙"
authority_set:
  - "AGENTS.md"
supporting_docs_only:
  - "ops console Repository Map (`commands/ops-console-app/ops-console/public/repository-map.html`)"
  - "ops console Data Reference Map (`commands/ops-console-app/ops-console/public/data-reference-map.html`)"
  - "`KPI-Server` AGENTS.md, README, and code as read-only reference"
  - "`KPI-local` AGENTS.md, README, and code as read-only reference"
  - "legacy analyses, old prompts, local assessment notes"
```

## 0. Normative Keywords / 규범 키워드

### Directive A-00
- KR: `MUST / 반드시`는 예외 없이 따라야 하는 하드 룰이다.
- EN: `MUST` means a hard requirement with no silent exception.

### Directive A-00b
- KR: `MUST NOT / 절대 금지`는 예외 없이 금지되는 행위다.
- EN: `MUST NOT` means a prohibited action with no silent exception.

### Directive A-00c
- KR: `SHOULD / 기본값`은 강한 기본값이며, 벗어나려면 이유를 남겨야 한다.
- EN: `SHOULD` is a strong default; deviation requires an explicit reason.

### Directive A-00d
- KR: `MAY / 선택 가능`은 상황이 정당화될 때만 허용되는 선택이다.
- EN: `MAY` is optional only when the context clearly justifies it.

## 1. Authority, Precedence, and Cross-Document Boundary / 권한, 우선순위, 문서 간 경계

### Directive A-01
- KR: 현재 대화의 명시적 사용자 지시는 항상 이 문서보다 우선한다.
- EN: Explicit user instructions in the current conversation always override this document.

### Directive A-02
- KR: `AGENTS.md`는 이 저장소의 AI 작업 방식, 공개 안전 기준, 참조 저장소 경계, 코드 구조 규칙, 테스트/완료 기준을 결정한다.
- EN: `AGENTS.md` governs AI behavior, public-safety rules, reference-repository boundaries, code-structure rules, and testing/completion standards for this repository.

### Directive A-03
- KR: 이 저장소의 활성 권위 문서는 `AGENTS.md` 하나다. 병렬 규칙 문서, 옛 patch log, companion 문서, handoff 문서는 현재 기준이 아니다.
- EN: `AGENTS.md` is the only active authority document for this repository. Parallel rule docs, old patch logs, companion docs, and handoff docs are not current authority.

### Directive A-04
- KR: 사용자에게 보여줄 폴더 지도, 변경 이력, 쉬운 설명, 개인정보 보호 설명, 검증 맥락은 운영 콘솔 Repository Map에 흡수한다.
- EN: User-facing folder maps, change history, plain-language notes, privacy notes, and verification context belong in the ops-console Repository Map.

### Directive A-05
- KR: 새 규칙은 병렬 문서로 만들지 않고 이 `AGENTS.md`에 흡수한다.
- EN: New standing rules MUST be absorbed into this `AGENTS.md`, not created as parallel documents.

### Directive A-06
- KR: `KPI-Server`와 `KPI-local`의 `AGENTS.md`, README, 코드, 스크립트, 데이터, commit, 로컬 관습은 참고 자료일 뿐 이 저장소의 규칙을 덮어쓰지 않는다.
- EN: `KPI-Server` and `KPI-local` `AGENTS.md`, README, code, scripts, data, commits, and local conventions are supporting references only; they do not override this repository's rules.

### Directive A-07
- KR: 참조본과 이 문서가 포트, 공개 범위, 개인정보, 검증 기준, 문서 언어에서 충돌하면 `KPI-Demo`의 `AGENTS.md`가 이긴다.
- EN: If a reference conflicts with this document on ports, exposure scope, privacy, verification gates, or documentation language, `KPI-Demo` `AGENTS.md` wins.

### Directive A-08
- KR: `KPI Demo`는 배포 미러나 실운영 아카이브가 아니라 공개 포트폴리오 데모다.
- EN: `KPI Demo` is a public portfolio demo, not a deployment mirror or live-operations archive.

### Directive A-09
- KR: 삭제된 문서명, 오래된 프롬프트, 로컬 평가 메모는 참고 흔적으로만 읽고, 현재 규칙 판단은 `AGENTS.md`로 한다.
- EN: Removed document names, old prompts, and local assessment notes are reference traces only; current decisions are based on `AGENTS.md`.

## 1a. Reference Repository Boundary / 참조 저장소 경계

### Directive A-09a
- KR: `KPI-Server`는 서버형 런타임, 계층 구조, 운영 보조 흐름을 참고하는 기준이다. 이 저장소에 실서버 상태나 비공개 운영 자료를 가져오는 기준이 아니다.
- EN: `KPI-Server` is a reference for server-backed runtime structure, layering, and operations helpers. It is not a source for importing live-server state or private operational material into this repository.

### Directive A-09b
- KR: `KPI-local`은 서버 반영 전 로컬 실험, 패치 검토, 안전 검증 흐름을 참고하는 기준이다. 이 저장소에 로컬 실험 포트, DB 이름, Git remote 정책을 그대로 복사하지 않는다.
- EN: `KPI-local` is a reference for local experimentation, patch review, and safety verification before server application. Do not copy its experiment ports, DB names, or Git remote policy verbatim into this repository.

### Directive A-09c
- KR: 두 참조 저장소는 기본적으로 읽기 전용이다. 사용자가 현재 대화에서 명시하지 않는 한 해당 저장소 안의 파일, Git 설정, commit history, remote, tag, release, GitHub Actions를 수정하거나 실행하지 않는다.
- EN: Both reference repositories are read-only by default. Unless explicitly requested in the current conversation, do not edit their files, Git settings, commit history, remotes, tags, releases, or GitHub Actions.

### Directive A-09d
- KR: 비교용 clone이 필요하면 저장소 밖 임시 경로나 무시된 scratch 경로에 두고, 작업 후 제거한다. `KPI-Demo` 상위 Git에서 참조 clone을 추적하지 않는다.
- EN: If a comparison clone is needed, place it outside the repository or in an ignored scratch path, and remove it after use. Do not track reference clones in the `KPI-Demo` parent Git.

### Directive A-09e
- KR: 참조본에서 규칙이나 아이디어를 가져올 때는 `KPI-Demo`의 공개 이름, 폴더 구조, 포트 계약, 개인정보 규칙, 검증 게이트에 맞게 재작성한다.
- EN: When absorbing rules or ideas from a reference, rewrite them to `KPI-Demo` public naming, folder structure, port contract, privacy rules, and verification gates.

### Directive A-09f
- KR: 참조본의 파일, 임시 폴더 구조, commit history, 스크린샷, DB dump, 업로드 파일, log, `.env`, runtime `var/`, 생성 자격 증명, 개인 메모는 이 저장소로 복사하지 않는다.
- EN: Do not copy reference files, temporary folder layouts, commit history, screenshots, DB dumps, uploaded files, logs, `.env`, runtime `var/`, generated credentials, or personal notes into this repository.

### Directive A-09g
- KR: 참조본의 실운영 표현, 실제 조직처럼 보이는 문구, 실제 현장/사람/설비/값처럼 보이는 내용은 공개-safe 합성 문구로 바꾼 뒤에만 추가한다.
- EN: Reference wording that implies live operation, real organizations, real sites, people, equipment, or values may be added only after being rewritten into public-safe synthetic wording.

### Directive A-09h
- KR: 참조본의 runtime port, local experiment port, DB port, tunnel/Caddy/cloudflared/firewall/startup-task/non-loopback binding 설정을 active demo 명령이나 문서에 들여오지 않는다.
- EN: Do not bring reference runtime ports, local experiment ports, DB ports, tunnel/Caddy/cloudflared/firewall/startup-task/non-loopback binding settings into active demo commands or docs.

### Directive A-09i
- KR: 참조 흡수 작업은 `비교 -> Demo 기준 재작성 -> 개인정보 영향 확인 -> README 또는 Repository Map 설명 -> 검증` 순서로 끝낸다.
- EN: Reference absorption work finishes through `compare -> rewrite for Demo -> privacy-impact check -> README or Repository Map explanation -> verification`.

### Directive A-09j
- KR: 공개 문서는 `KPI Demo`가 `KPI-Server`와 `KPI-local`을 참고해 구성된 대외용 데모라고 설명할 수 있다. 단, 실운영 사실, private source, 내부 증빙, 비공개 링크는 설명하지 않는다.
- EN: Public docs may say that `KPI Demo` was shaped from `KPI-Server` and `KPI-local` references. They MUST NOT disclose live-operational facts, private sources, internal evidence, or non-public links.

## 2. Repository Purpose and Privacy / 저장소 목적과 개인정보 보호

### Directive A-20
- KR: 이 저장소는 제조 운영 포트폴리오를 위한 공개-safe KPI 데모 대시보드다.
- EN: This repository is a public-safe KPI demo dashboard for a manufacturing operations portfolio.

### Directive A-21
- KR: 공개 명칭은 프로젝트에 `KPI Demo`, Node 런타임 표면에 `KPI Demo Runtime`을 사용한다.
- EN: Public naming SHOULD use `KPI Demo` for the project and `KPI Demo Runtime` for the Node runtime surface.

### Directive A-22
- KR: 실제 회사명, 고객명, 직원명, 현장명, 설비명, 생산값, 검침값, 청구값, 정비값은 저장소에 넣지 않는다.
- EN: Do not add real organization names, client names, employee names, site names, equipment names, production values, metering values, billing values, or maintenance values to the repository.

### Directive A-23
- KR: 내부 로고, 원본 스크린샷, 첨부 파일, 비공개 연구 메모, 데모 외 계획 노트, 비공개 링크는 저장소에 넣지 않는다.
- EN: Do not add internal logos, original screenshots, attachments, private research notes, non-demo planning notes, or non-public links to the repository.

### Directive A-24
- KR: 기본 대체어는 `Demo Organization`, `Demo Partner`, `Demo Client A`, `Plant A`, `Plant B`, `Line Alpha`, `Process Alpha`, `Demo Boiler A`, `Product A`, `Operator A`, `Sample Equipment`, `Synthetic KPI value`를 사용한다.
- EN: Preferred replacements are `Demo Organization`, `Demo Partner`, `Demo Client A`, `Plant A`, `Plant B`, `Line Alpha`, `Process Alpha`, `Demo Boiler A`, `Product A`, `Operator A`, `Sample Equipment`, and `Synthetic KPI value`.

### Directive A-25
- KR: 도메인 설명에 필요한 용어는 generic하게 유지한다. 예: 실제 vendor명 대신 `manufacturing operations software provider`.
- EN: Domain terms should remain generic. Example: use `manufacturing operations software provider`, not a real vendor name.

## 3. Language and Documentation Policy / 언어와 문서 정책

### Directive A-30
- KR: 저장소 소유 포트폴리오 문서는 한국어 우선으로 작성한다.
- EN: Repository-owned portfolio documentation SHOULD be Korean-first.

### Directive A-31
- KR: 기술 식별자, 명령어, 경로, API명, stack명은 정확성이 중요하면 영어를 유지한다.
- EN: Technical identifiers, commands, paths, API names, and stack names MAY remain in English when precision matters.

### Directive A-32
- KR: GitHub 방문자 이해에 도움이 되는 짧은 English keywords 또는 summary는 허용하지만 README류 설명의 기본 언어를 영어로 바꾸지 않는다.
- EN: Short English keywords or summaries are allowed when helpful for GitHub visitors, but English MUST NOT become the default language for README-style explanation.

### Directive A-33
- KR: 사용자에게 보여주는 채팅 설명은 사용자가 다른 언어를 요구하지 않는 한 한국어로 한다.
- EN: User-facing chat explanations SHOULD be Korean unless the user asks for another language.

### Directive A-34
- KR: Repository Map은 포트폴리오 구조, 변경 이력, 쉬운 설명, 개인정보 보호 기준, 검증 맥락을 한국어/영어 보기로 제공해야 한다.
- EN: The Repository Map MUST support Korean and English views for portfolio structure, change history, plain-language notes, privacy notes, and verification context.

### Directive A-35
- KR: 사용자가 명시하지 않는 한 장기 규칙, checklist, prompt, handoff markdown 파일을 새로 만들지 않는다.
- EN: Do not create additional long-lived rules, checklist, prompt, or handoff markdown files unless the user explicitly asks.

## 4. Local Port and Runtime Contract / 로컬 포트와 런타임 계약

### Directive A-40
- KR: 공개 정적 포트폴리오 데모는 `5500`을 사용한다.
- EN: The public static portfolio demo uses port `5500`.

### Directive A-41
- KR: 선택형 `KPI Demo Runtime` Node 서버는 `3104`를 사용한다.
- EN: The optional `KPI Demo Runtime` Node server uses port `3104`.

### Directive A-42
- KR: 런타임용 로컬 PostgreSQL은 `5400`을 사용한다.
- EN: The local PostgreSQL database for the runtime uses port `5400`.

### Directive A-43
- KR: 로컬 operations console 기본 포트와 owner-console embed target은 `3215`를 사용한다.
- EN: The local operations console default port and owner-console embed target use port `3215`.

### Directive A-44
- KR: runtime `3100`, verification `3192`, PostgreSQL `5434`, local experiment `18080`, `18092`, `55432` 같은 참조본 포트를 active `KPI-Demo` 명령, 설정, 예시, smoke check, README에 재도입하지 않는다.
- EN: Do not reintroduce reference ports such as runtime `3100`, verification `3192`, PostgreSQL `5434`, local experiment `18080`, `18092`, or `55432` into active `KPI-Demo` commands, config, examples, smoke checks, or README.

### Directive A-45
- KR: 사용자가 미래 포트 변경을 명시적으로 요청하면 영향을 받는 명령, runtime config, deploy example, smoke check, README, Repository Map을 같은 patch에서 함께 갱신한다.
- EN: If the user explicitly asks for a future port change, update affected commands, runtime config, deploy examples, smoke checks, README, and Repository Map in the same patch.

## 5. AI Working Posture / AI 작업 태도

### Directive A-50
- KR: 작업 전에는 관련 파일을 먼저 읽는다.
- EN: Read relevant files before editing.

### Directive A-51
- KR: 요청을 해결하는 가장 작은 coherent change를 우선한다.
- EN: Prefer the smallest coherent change that solves the request.

### Directive A-52
- KR: 폴더 구조 변경, 노출 범위 변경, 저장 권위 변경, 인증/권한 변경은 명시 요청 없이 하지 않는다.
- EN: Do not change folder structure, exposure scope, storage authority, authentication, or authorization without explicit request.

### Directive A-53
- KR: 다른 local copy, backup, old prompt, external working copy에서 아이디어를 가져올 때도 이 저장소의 경로, 이름, 레이어, 개인정보, 검증 기준에 맞게 재작성한다.
- EN: Ideas from another local copy, backup, old prompt, or external working copy must be reshaped to this repository's paths, names, layers, privacy rules, and verification gates.

### Directive A-54
- KR: 깨진 인코딩 문서를 repository-owned documentation에 남기지 않는다.
- EN: Do not leave broken-encoding content in repository-owned documentation.

### Directive A-55
- KR: dummy data는 Git에서 직접 검토할 수 있을 만큼 작게 유지한다.
- EN: Keep dummy data small enough to review directly in Git.

## 6. Code and Architecture Rules / 코드와 아키텍처 규칙

### Directive A-60
- KR: UI, routing, service, repository, storage 책임을 분리한다.
- EN: Keep UI, routing, service, repository, and storage responsibilities separate.

### Directive A-61
- KR: 작은 reversible patch를 우선한다.
- EN: Prefer small, reversible patches.

### Directive A-62
- KR: `utils`, `misc`, `common` 같은 broad helper module은 명확한 local pattern 없이 새로 만들지 않는다.
- EN: Do not introduce broad helper modules such as `utils`, `misc`, or `common` without a clear local pattern.

### Directive A-63
- KR: 새 파일이나 크게 수정하는 파일은 작은 함수와 명확한 소유권을 유지한다. 이미 큰 파일은 좁은 수정이 아니면 더 키우지 않는다.
- EN: New or heavily edited files should keep functions small and ownership clear. If a file is already large, avoid making it worse unless the change is narrow.

### Directive A-64
- KR: 외부 입력은 boundary에서 검증한다. input shaping, domain rules, persistence, rendering을 한 함수에 섞지 않는다.
- EN: Validate external input at the boundary. Do not mix input shaping, domain rules, persistence, and rendering in one function.

### Directive A-65
- KR: served asset을 이동하거나 이름 바꾸면 `KPI.html`, loaders, smoke tests, docs를 같은 patch에서 갱신한다.
- EN: When moving or renaming served assets, update `KPI.html`, loaders, smoke tests, and docs in the same patch.

### Directive A-66
- KR: server-backed behavior를 바꾸면 migrations, repositories, services, routes, tests, docs를 함께 맞춘다.
- EN: When changing server-backed behavior, keep migrations, repositories, services, routes, tests, and docs aligned.

### Directive A-67
- KR: 현재 Demo Node baseline을 명시 승인 없이 FastAPI, NestJS, React, 새 UI framework로 몰래 재작성하지 않는다.
- EN: Do not silently rewrite the current Demo Node baseline into FastAPI, NestJS, React, or a new UI framework without explicit approval.

## 7. Security Rules / 보안 규칙

### Directive A-70
- KR: 버튼을 숨기거나 비활성화하는 것은 권한 통제가 아니다. 서버 write와 민감 read는 서버 측 auth, permission, object-level check를 통과해야 한다.
- EN: Hidden or disabled buttons are not authorization. Server writes and sensitive reads MUST pass server-side auth, permission, and object-level checks.

### Directive A-71
- KR: IDOR, SQL injection, XSS, CSRF, broken session handling, secret exposure를 baseline threat로 본다.
- EN: Treat IDOR, SQL injection, XSS, CSRF, broken session handling, and secret exposure as baseline threats.

### Directive A-72
- KR: `postMessage`는 same-origin 또는 명시 allowlist origin만 사용한다. privileged payload에 `*` targetOrigin을 쓰지 않는다.
- EN: `postMessage` MUST be restricted to same-origin or an explicit allowlist origin. Do not use `*` targetOrigin for privileged payloads.

### Directive A-73
- KR: 파일 업로드와 document storage 변경은 extension allowlist, size limit, server-generated filename, safe storage path를 사용한다.
- EN: File upload and document-storage changes MUST use extension allowlists, size limits, server-generated filenames, and safe storage paths.

### Directive A-74
- KR: public exposure, firewall, tunnel, reverse proxy, non-loopback binding은 명시 승인 없이 변경하지 않는다.
- EN: Public exposure, firewall, tunnel, reverse proxy, and non-loopback binding MUST NOT be changed without explicit approval.

### Directive A-75
- KR: 인증, 권한, 승인 흐름, 저장 권위본, 마이그레이션, 백업/복구, 보안 사고 대응은 사람 검토가 필요한 고위험 영역이다.
- EN: Authentication, authorization, approval flows, storage authority, migrations, backup/restore, and security-incident response are high-risk areas requiring human review.

## 8. Verification and Done Gates / 검증과 완료 게이트

### Directive A-80
- KR: 문서만 수정할 때는 markdown readback, 민감 문자열 스캔, retired/private label 재유입 확인을 수행한다.
- EN: For doc-only changes, run markdown readback, sensitive-string scans, and checks for reintroduced retired/private labels.

### Directive A-81
- KR: `kpi-runtime/internal-server/` 아래 코드를 수정하면 `npm run format:check`, `npm run lint`, 관련 targeted test를 실행한다.
- EN: Changes under `kpi-runtime/internal-server/` MUST run `npm run format:check`, `npm run lint`, and relevant targeted tests.

### Directive A-82
- KR: auth/session, permissions, migrations, file storage, runtime bootstrap, shared server behavior, portfolio-sharing release candidate를 건드리면 `npm run verify`도 실행한다.
- EN: If touching auth/session, permissions, migrations, file storage, runtime bootstrap, shared server behavior, or a portfolio-sharing release candidate, also run `npm run verify`.

### Directive A-83
- KR: browser-visible change는 실제 running server 또는 기존 browser smoke test로 확인한다.
- EN: Browser-visible changes MUST be verified against a real running server or an existing browser smoke test.

### Directive A-84
- KR: 정적 데모 검증 서버는 사용자가 다른 포트를 요구하지 않는 한 `KPI-Demo/` 루트에서 `python -m http.server 5500`을 사용한다.
- EN: Unless the user asks for another port, verify the static demo with `python -m http.server 5500` from the `KPI-Demo/` root.

### Directive A-85
- KR: 검증을 실행할 수 없으면 이유와 남은 위험을 최종 보고에 명시한다.
- EN: If verification cannot be run, report the reason and remaining risk in the final handoff.

### Directive A-86
- KR: 저장소 표준 명령이 있으면 README, package.json, CI에 선언된 명령을 따른다. 임의 검증 경로를 만들지 않는다.
- EN: If standard commands exist, follow README, package.json, and CI. Do not invent a new verification path.

## 9. Repository Map and Data Reference Rules / Repository Map과 Data Reference 규칙

### Directive A-90
- KR: repository-owned documentation 또는 code change는 Repository Map에 날짜, touched area, summary, changed files, privacy impact, verification result를 남긴다.
- EN: Repository-owned documentation or code changes MUST add a Repository Map entry with date, touched area, summary, changed files, privacy impact, and verification result.

### Directive A-91
- KR: Repository Map은 폴더 트리를 상단 근처에 유지하고, 한국어 view가 영어 entry와 같은 의미를 plain language로 반영해야 한다.
- EN: The Repository Map should keep the folder tree near the top, and the Korean view must mirror English entries in plain language.

### Directive A-92
- KR: Data Reference Map은 최신 데이터 흐름만 보여준다. patch log를 쌓지 않는다.
- EN: The Data Reference Map shows current data flows only. Do not turn it into a patch log.

### Directive A-93
- KR: `module_key`, `record_key`, `permission_key`, `app_documents` owner/file category, storage root, API route, DB table 같은 데이터 경로가 바뀌면 Data Reference Map도 같은 patch에서 갱신한다.
- EN: If data paths such as `module_key`, `record_key`, `permission_key`, `app_documents` owner/file category, storage root, API route, or DB table change, update the Data Reference Map in the same patch.

## 10. Final Report Contract / 최종 보고 계약

### Directive A-100
- KR: 최종 보고에는 최소한 `무엇을 바꿨는지`, `변경 파일`, `검증 결과`, `남은 위험 또는 다음 조치`를 포함한다.
- EN: Final reporting MUST include at least `what changed`, `changed files`, `verification results`, and `remaining risk or next action`.

### Directive A-101
- KR: 중간 이상 규모 작업은 가능하면 `설계 산출물`, `코드 산출물`, `운영 산출물`, `검증 산출물`로 나눠 보고한다.
- EN: For medium-or-larger work, report `design artifacts`, `code artifacts`, `operations artifacts`, and `verification artifacts` when practical.

## 11. Easy English Companion / 쉬운 영어 요약

- This file controls how AI agents work in the public `KPI Demo` repository.
- `KPI-Server` and `KPI-local` are read-only references. They do not override this file.
- Absorb only public-safe ideas from the references. Do not copy private data, runtime artifacts, credentials, screenshots, or reference-only ports.
- Active demo ports are static `5500`, runtime `3104`, PostgreSQL `5400`, and operations console `3215`.
- README-style docs are Korean-first, with short English keywords where helpful.
- Repository Map owns portfolio-facing folder maps, change history, privacy notes, and verification context.
- Data Reference Map owns current data-flow reference only.
- Code changes should preserve UI, route, service, repository, and storage boundaries.
- Human review is mandatory for auth, permissions, migrations, backup/restore, storage authority, and exposure-boundary changes.
- Work is not done until the relevant verification gate has run or the gap is clearly reported.
