# KPI Demo

제조 운영 데이터를 한 화면에서 확인하는 공개 포트폴리오용 KPI 대시보드 데모입니다. 생산, 유틸리티 검침, 정산, 작업 기록, 감사, 설비 이력 흐름을 브라우저 기반 화면으로 정리했습니다.

이 저장소는 실제 조직의 업무 데이터를 공개하지 않습니다. 조직명, 현장명, 설비명, 사람 이름, 생산값, 검침값, 청구값은 모두 합성 데이터로 구성했습니다.

## 데모 범위

- KPI 대시보드: 생산, 유틸리티, 작업, 감사, 데이터 관리 화면 탐색
- 유틸리티 검침: 전기, 가스, 폐수 월별 입력과 정산 보조 흐름
- 생산 데이터: 생산 자료 import/export와 날짜, 팀, 제품 기준 정리
- 작업 기록: 팀별 달력, 작업 내역, 월간 보고 흐름
- 감사와 설비: 점검 기록, 법정 설비 관리, 설비 이력카드, 관련 문서 흐름
- 서버 런타임 구조: Node.js, PostgreSQL, 사용자/세션/권한, 파일 저장, migration 구조

## 실행

Windows에서는 KPI-Server와 같은 방식으로 서버 관리 콘솔만 엽니다.

```text
commands\open-ops-console.cmd
commands\close-ops-console.cmd
```

`open-ops-console.cmd`는 로컬 서버 관리 콘솔을 열고, 콘솔 안의 `서버 열기` 버튼이 KPI Demo Runtime과 PostgreSQL을 올립니다. 서버 실행 후 브라우저에서 아래 주소를 확인합니다.

```text
http://127.0.0.1:3104/login
```

서버 종료는 콘솔의 `서버 닫기`를 사용합니다. `close-ops-console.cmd`는 콘솔 창만 닫는 용도입니다.

## 주요 경로

- `KPI.html`: 포트폴리오 데모 화면
- `kpi-runtime/demo/KPI.demo-data.js`: 공개용 합성 데이터
- `utility/`: 유틸리티 검침, 정산, 생산 추출, 보고서 화면
- `team-report/`: 팀별 작업 달력, 작업 내역, 월간 보고 화면
- `audit/`: 감사와 법정 설비 관리 화면
- `data-entry/`: 설비 이력카드와 수기 입력 화면
- `kpi-runtime/internal-server/`: Node.js/PostgreSQL 런타임 구조
- `commands/ops-console-app/`: 서버 관리, 저장소 구조, 패치 이력을 확인하는 로컬 콘솔
- `AGENTS.md`: 공개 데모 기준, 개인정보 보호 규칙, 검증 규칙

## 공개 데이터 기준

- 실제 회사명, 고객명, 직원명, 현장명, 설비명은 저장소에 넣지 않습니다.
- 실제 생산, 검침, 정산, 청구, 정비 값은 저장소에 넣지 않습니다.
- 데모 조직명과 라벨은 `Demo Organization`, `Plant A`, `Line Alpha`, `Demo Boiler A`, `Product A`처럼 일반화된 이름만 사용합니다.
- 스크린샷, 첨부 문서, 로고, 로컬 실행 산출물은 공개용으로 정리된 자료만 포함합니다.

## 검증 기준

문서만 수정할 때는 markdown 읽기 확인과 민감 문자열 스캔을 수행합니다. 브라우저 화면을 수정할 때는 정적 서버 또는 기존 smoke test로 실제 표시 흐름을 확인합니다.

`kpi-runtime/internal-server/` 아래 코드를 수정할 때는 저장소 규칙에 따라 format, lint, 관련 테스트를 함께 확인합니다.

## English Keywords

Manufacturing operations dashboard, KPI demo, browser-based internal tool, synthetic data, Node.js runtime, PostgreSQL, utility metering, production reporting, work history, audit records, equipment history, smoke tests.
