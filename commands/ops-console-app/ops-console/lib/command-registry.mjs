export const commandRegistry = [
  { key: 'server.start', category: 'server', title: '서버 열기', description: 'KPI 서버, 로컬 PostgreSQL, 환경 파일을 현재 런타임 기준으로 올립니다.', kind: 'action' },
  { key: 'server.stop', category: 'server', title: '서버 닫기', description: 'KPI 서버와 로컬 PostgreSQL을 순서대로 종료합니다.', kind: 'action', confirmMessage: 'KPI 서버와 로컬 PostgreSQL을 종료합니다.' },
  { key: 'server.recover', category: 'server', title: '복구 재시작', description: '서버를 정리한 뒤 stale postmaster.pid를 안전 조건에서만 정리하고 다시 올립니다.', kind: 'action', confirmMessage: '현재 서버를 복구 재시작합니다.' },
  { key: 'startup.register', category: 'startup', title: '부팅 자동실행 등록', description: '현재 사용자 로그인 시 KPI 서버를 자동으로 올리는 시작프로그램을 등록합니다.', kind: 'action' },
  { key: 'startup.unregister', category: 'startup', title: '부팅 자동실행 해제', description: '현재 사용자 시작프로그램 자동실행을 제거합니다.', kind: 'action' },
  {
    key: 'account.bootstrapOwner',
    category: 'account',
    title: '오너 생성',
    description: '최초 owner 계정을 로컬에서 직접 생성합니다.',
    kind: 'form',
    fields: [
      { name: 'username', label: '오너 아이디', type: 'text', placeholder: 'owner', required: true },
      { name: 'displayName', label: '오너 표시 이름', type: 'text', placeholder: 'KPI Owner', required: true },
      { name: 'password', label: '비밀번호', type: 'password', required: true }
    ]
  },
  {
    key: 'account.createEmployee',
    category: 'account',
    title: '직원 계정 생성',
    description: 'viewer 기본 역할로 새 계정을 생성합니다.',
    kind: 'form',
    fields: [
      { name: 'username', label: '직원 아이디', type: 'text', placeholder: 'staff-01', required: true },
      { name: 'displayName', label: '직원 표시 이름', type: 'text', placeholder: '직원 이름', required: true },
      { name: 'password', label: '비밀번호', type: 'password', required: true },
      {
        name: 'roles',
        label: '역할',
        type: 'select',
        required: true,
        options: [
          { value: 'viewer', label: 'viewer' },
          { value: 'sheet_editor', label: 'sheet_editor' },
          { value: 'admin', label: 'admin' }
        ],
        defaultValue: 'viewer'
      }
    ]
  },
  {
    key: 'account.resetPassword',
    category: 'account',
    title: '비밀번호 재설정',
    description: '선택한 사용자 비밀번호를 새 값으로 바꿉니다.',
    kind: 'form',
    fields: [
      { name: 'username', label: '대상 아이디', type: 'text', required: true },
      { name: 'password', label: '새 비밀번호', type: 'password', required: true }
    ]
  },
  {
    key: 'account.deleteUser',
    category: 'account',
    title: '사용자 삭제',
    description: 'owner가 아닌 계정을 실제로 삭제합니다.',
    kind: 'form',
    confirmMessage: '사용자 계정을 실제로 삭제합니다.',
    fields: [
      { name: 'username', label: '삭제할 아이디', type: 'text', required: true },
      { name: 'confirmText', label: '확인 문구', type: 'text', placeholder: 'DELETE', required: true }
    ]
  },
  { key: 'db.listTables', category: 'db', title: 'DB 테이블 보기', description: 'psql 결과를 이 화면에서 바로 보여줍니다.', kind: 'action' },
  { key: 'db.openConsole', category: 'db', title: 'DB 콘솔 창 열기', description: '새 PowerShell 창에서 psql 콘솔을 엽니다.', kind: 'action' },
  { key: 'filesystem.openCommandsFolder', category: 'tools', title: 'commands 폴더 열기', description: '기존 commands 폴더를 탐색기에서 엽니다.', kind: 'action' },
  { key: 'filesystem.openLogsFolder', category: 'tools', title: '로그 폴더 열기', description: 'internal-server 로그 폴더를 탐색기에서 엽니다.', kind: 'action' },
  {
    key: 'system.scheduleShutdown',
    category: 'system',
    title: '컴퓨터 시작 / 종료 예약',
    description: '시작 또는 종료 시각을 예약합니다. 시작 예약은 절전/최대절전 복귀 기준입니다.',
    kind: 'form',
    fields: [
      {
        name: 'actionType',
        label: '예약 종류',
        type: 'select',
        required: true,
        options: [
          { value: 'start', label: '시작' },
          { value: 'shutdown', label: '종료' }
        ],
        defaultValue: 'shutdown'
      },
      { name: 'timeText', label: '예약 시각', type: 'text', placeholder: '22:00', required: true }
    ]
  }
];
