import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const auditRenderSource = await fs.readFile(
  path.join(repoRoot, 'audit/runtime/audit/records/KPI.audit.records.render.js'),
  'utf8'
);
const auditDataSource = await fs.readFile(
  path.join(repoRoot, 'audit/runtime/audit/records/KPI.audit.records.data.js'),
  'utf8'
);
const auditWorkspaceSource = await fs.readFile(
  path.join(repoRoot, 'audit/runtime/audit/records/KPI.audit.records.lux-workspace.js'),
  'utf8'
);
const fileRoutesSource = await fs.readFile(
  path.join(repoRoot, 'kpi-runtime/internal-server/src/routes/file-routes.js'),
  'utf8'
);

test('audit lux batch entry waits for the server save before rendering success', () => {
  assert.match(auditRenderSource, /async function saveAuditLuxBatchEntries/);
  assert.match(auditRenderSource, /saved = await Promise\.resolve\(saveAuditData\(dataKey, data\)\)/);
  assert.match(auditRenderSource, /조도 일괄 입력을 서버에 저장하지 못했습니다/);
  assert.match(auditRenderSource, /Object\.assign\(data, previousData\)/);
});

test('audit lux evidence validates at the server boundary and avoids deleting old files after a failed record save', () => {
  assert.match(fileRoutesSource, /'audit\.lux\.evidence'/);
  assert.match(fileRoutesSource, /function isAuditLuxEvidenceUpload/);
  assert.match(auditDataSource, /saved = await Promise\.resolve\(saveAuditData\(dataKey, data\)\)/);
  assert.match(auditDataSource, /deleteAuditEvidenceFromServer\(uploaded\)/);
  assert.match(auditDataSource, /throw new Error\('audit_lux_evidence_record_save_failed'\)/);
  assert.match(auditWorkspaceSource, /첨부 파일은 올라갔지만 조도 기록 저장이 실패해 교체를 취소했습니다/);
});
