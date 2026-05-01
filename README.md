# KPI Demo

제조 현장의 생산, 검침, 정산, 작업보고, 감사, 설비 이력 데이터를 브라우저 기반 KPI 업무 시스템으로 정리한 공개 포트폴리오 데모입니다.

이 저장소는 실제 회사 데이터를 공개하기 위한 저장소가 아닙니다. 내부 업무 시스템을 만들며 정리한 구조를 취업용으로 보여줄 수 있도록 실제 조직명, 현장명, 설비명, 사람 이름, 생산값, 검침값, 청구값을 제거하고 합성 데이터로 다시 구성했습니다.

## 무엇을 만든 프로젝트인가

`KPI Demo`는 제조 운영에서 흩어지기 쉬운 데이터를 하나의 대시보드 흐름으로 묶는 프로젝트입니다. 생산량, 전기/가스/폐수 검침, 월별 정산, 팀별 작업 내역, 점검 기록, 법정 설비 관리, 설비 이력카드, 문서 첨부 흐름을 브라우저 화면과 선택형 Node.js/PostgreSQL 런타임으로 연결했습니다.

단순한 랜딩 페이지나 화면 시안이 아니라, 실제 업무자가 매일 입력하고 확인할 수 있는 운영형 도구를 목표로 만들었습니다.

## 왜 만들었나

제조 현장 업무는 엑셀, 수기 기록, 파일 첨부, 월별 보고, 팀별 정산처럼 데이터 기준이 서로 다른 일이 많습니다. 이 프로젝트는 그런 업무를 다음 흐름으로 바꾸는 것을 목표로 했습니다.

- 흩어진 기록을 날짜, 팀, 설비, 제품, 월 단위 기준으로 정리
- 엑셀처럼 입력하던 값을 브라우저 입력 화면과 요약 화면으로 전환
- 생산, 검침, 정산, 작업보고, 감사, 설비 이력을 한 대시보드 안에서 연결
- 문서 첨부, 권한, 백업, 복구, 운영 콘솔 같은 실제 운영 요소까지 고려
- 공개 포트폴리오 제출을 위해 모든 민감 정보를 합성 데이터로 치환

## 이 프로젝트에서 드러나는 역량

이 프로젝트의 핵심은 "예쁜 화면을 만들었다"가 아니라 "복잡한 업무를 시스템 구조로 바꿨다"입니다.

- 제조 현장 업무를 화면, 데이터, 저장, 보고, 운영 절차로 나누는 구조화 역량
- 생산/검침/정산/작업/감사/설비 이력처럼 서로 다른 업무 데이터를 하나의 흐름으로 연결한 경험
- 엑셀 기반 업무를 import/export, 중복 제거, 날짜 정규화, 월별/팀별 집계 흐름으로 바꾼 경험
- 정적 데모와 서버 런타임을 분리해 공개용 데모와 운영형 구조를 함께 관리한 경험
- Node.js, PostgreSQL, route/service/repository 구조, migration, auth/session, 파일 저장 흐름을 다룬 경험
- Windows 로컬 실행, 포트 규칙, 운영 콘솔, 백업/복구 스크립트까지 고려한 운영 감각
- 테스트, lint, format check, smoke test로 큰 프로젝트를 보호하려는 검증 습관
- 실제 데이터를 공개하지 않고 합성 데이터 기반 포트폴리오로 바꾸는 보안/공개 안전성 감각

개발 전공자로 출발한 프로젝트는 아니지만, 현장 업무를 이해하고 AI 도구와 개발 도구를 활용해 요구사항, 화면 흐름, 데이터 구조, 검증 기준을 반복적으로 정리하며 완성한 프로젝트입니다.

## 주요 기능

- KPI 대시보드: 생산, 유틸리티, 작업, 감사, 데이터 관리 화면을 하나의 진입점에서 탐색
- 유틸리티 검침: 전기/가스/폐수 월별 입력, 설비별 입력, 팀별 사용량, 정산 보조 흐름
- 생산 데이터 보조 도구: 생산 자료 import/export, 날짜/팀/제품 기준 정규화
- 팀 작업 내역: 팀별 달력, 작업 기록, 월간 보고, 출력/문서형 흐름
- 감사와 점검: 점검 기록, 법정 설비 관리, 증빙/문서형 화면
- 설비 이력카드: 설비 정보, 점검/정비 이력, 관련 문서, 출력 흐름
- 선택형 서버 런타임: Node.js, PostgreSQL, 사용자/세션/권한, 파일 저장, migration
- 운영 콘솔: 로컬 서버 시작/종료, DB 확인, 계정 관리, 백업/복구 보조 명령
- Repository Map: 폴더 구조, 변경 이력, 개인정보 보호 기준, 검증 맥락을 한영으로 확인

## 검토자가 먼저 볼 위치

- `KPI.html`: 정적 포트폴리오 데모의 시작 화면
- `kpi-runtime/demo/KPI.demo-data.js`: 공개용 합성 데이터
- `utility/`: 검침, 정산, 생산 추출, 유틸리티 보고서 흐름
- `team-report/`: 팀별 작업 달력, 작업 내역, 월간 보고 흐름
- `audit/`, `data-entry/`: 감사, 점검, 설비 이력카드, 수기 입력 화면
- `kpi-runtime/internal-server/`: 선택형 Node.js/PostgreSQL 런타임, routes/services/repositories/db/tests
- `commands/ops-console-app/`: 로컬 운영 콘솔과 Repository Map
- `AGENTS.md`: 공개 데모 기준, 개인정보 보호 규칙, 검증 규칙

## 데이터와 공개 안전 기준

- 이 저장소의 데모 데이터는 합성 데이터입니다.
- 실제 회사명, 고객명, 직원명, 현장명, 설비명, 생산값, 검침값, 청구값은 공개 저장소에 넣지 않습니다.
- 공개용 조직명은 `Demo Organization`처럼 일반화된 이름만 사용합니다.
- 팀, 공정, 설비, 제품 이름은 `Line Alpha`, `Process Alpha`, `Demo Boiler A`, `Product A` 같은 합성 라벨을 사용합니다.
- 외부 제출용 스크린샷도 합성 데이터 또는 편집된 데이터만 사용해야 합니다.
- 로고는 `shared-assets/kpi-demo-logo.svg`의 공개용 데모 로고만 사용합니다.

## 정적 데모 실행

이 폴더에서 실행합니다.

```powershell
python -m http.server 5500
```

브라우저에서 엽니다.

```text
http://127.0.0.1:5500/KPI.html
```

Windows 더블클릭 명령:

```text
commands\open-kpi-demo.cmd
commands\close-kpi-demo.cmd
```

루트에서 직접 실행하도록 남긴 명령은 이 두 개뿐입니다. `open-kpi-demo.cmd`는 정적 데모와 로컬 운영 콘솔을 시작하고, `close-kpi-demo.cmd`는 실행 중인 데모와 콘솔을 종료합니다.

## 로컬 포트

- 정적 포트폴리오 데모: `http://127.0.0.1:5500/KPI.html`
- 선택형 Node 런타임 로그인: `http://127.0.0.1:3104/login`
- 선택형 PostgreSQL 런타임 DB: `127.0.0.1:5400`
- 로컬 운영 콘솔: `http://127.0.0.1:3215`
- 운영 콘솔 fallback 포트: `3216`-`3218`

선택형 런타임 데모 로그인:

```text
ID: 1234
Password: 1234
```

## 선택형 런타임 실행

정적 데모만 볼 때는 이 단계가 필요 없습니다. PostgreSQL 기반 런타임과 운영 콘솔까지 확인할 때만 사용합니다.

런타임은 설치된 PostgreSQL 15-17, `KPI_POSTGRES_BIN_DIR`, 또는 저장소 로컬 portable PostgreSQL 도구를 사용할 수 있습니다. portable 도구는 `kpi-runtime/internal-server/var/tools/` 아래에 내려받으며 Git에는 포함하지 않습니다.

PostgreSQL 초기화, 데모 owner seed, Node 런타임 시작:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\kpi-runtime\internal-server\scripts\windows\initialize-central-runtime.ps1 -StartServer -BootstrapOwner
```

로컬 운영 콘솔 시작:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\commands\ops-console-app\scripts\start-ops-console.ps1
```

운영 콘솔은 런타임 시작/종료/복구, 계정 관리, DB 테이블 확인, DB 콘솔 실행, 로그 확인, 로컬 일정 보조 명령을 제공합니다.

## Repository Map

운영 콘솔을 켠 뒤 아래 주소를 엽니다.

```text
http://127.0.0.1:3215/repository-map.html
```

Repository Map은 `commands/ops-console-app/ops-console/public/` 아래에 있으며, 공개 포트폴리오 기준의 폴더 구조, 변경 이력, 개인정보 보호 기준, 검증 맥락을 한국어/영어 보기로 제공합니다. 저장소의 실제 작업 규칙은 `AGENTS.md`가 담당합니다.

## 검증 기준

문서만 수정할 때는 markdown 읽기 확인과 민감 문자열 스캔을 수행합니다. `kpi-runtime/internal-server/` 아래 코드를 수정할 때는 저장소 규칙에 따라 최소한 다음 검증을 수행합니다.

```powershell
npm run format:check
npm run lint
npm test
```

브라우저에서 보이는 화면을 수정할 때는 정적 서버 또는 기존 smoke test로 실제 표시 흐름을 확인합니다.

## English Keywords

Manufacturing operations dashboard, KPI demo, browser-based internal tool, synthetic data, Node.js runtime, PostgreSQL, data entry workflow, utility metering, production reporting, work history, audit records, equipment history, backup and recovery, smoke tests.
