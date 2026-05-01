import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

function readRepoFile(...segments) {
  return readFile(path.join(repoRoot, ...segments), 'utf8');
}

test('ops console exposes a separate data-reference tab beside Repository Map', async () => {
  const [indexHtml, appSource, mapHtml, mapSource, repositoryMapHtml] = await Promise.all([
    readRepoFile('commands', 'ops-console-app', 'ops-console', 'public', 'index.html'),
    readRepoFile('commands', 'ops-console-app', 'ops-console', 'public', 'app.js'),
    readRepoFile('commands', 'ops-console-app', 'ops-console', 'public', 'data-reference-map.html'),
    readRepoFile('commands', 'ops-console-app', 'ops-console', 'public', 'data-reference-map.js'),
    readRepoFile('commands', 'ops-console-app', 'ops-console', 'public', 'repository-map.html'),
  ]);

  assert.match(indexHtml, /data-tab="preview"[\s\S]*Repository Map/);
  assert.match(indexHtml, /data-tab="reference"/);
  assert.match(indexHtml, /data-i18n-key="dataReferenceTab"/);
  assert.match(indexHtml, /id="dataReferenceFrame"/);
  assert.match(indexHtml, /src="\/data-reference-map\.html"/);

  assert.match(appSource, /const TAB_REFERENCE = 'reference';/);
  assert.match(appSource, /dataReferenceFrame/);
  assert.match(appSource, /dataReferenceTitle/);
  assert.match(appSource, /normalized === TAB_DATA \|\| normalized === TAB_PREVIEW \|\| normalized === TAB_REFERENCE/);

  assert.match(mapHtml, /id="dataFlowSearch"/);
  assert.match(mapHtml, /id="architectureWeb"/);
  assert.match(mapHtml, /id="webLines"/);
  assert.match(mapHtml, /id="webNodes"/);
  assert.match(mapHtml, /id="flowSelectorPanel"/);
  assert.match(mapHtml, /class="flow-selector-panel"/);
  assert.match(mapHtml, /id="flowDetailDisclosure"/);
  assert.match(mapHtml, /class="flow-detail-disclosure"/);
  assert.match(mapHtml, /id="flowDetail"/);
  assert.match(mapHtml, /id="flowList"/);
  assert.match(mapHtml, /id="moduleRecordToggle"/);
  assert.match(mapHtml, /id="moduleRecordLayer"/);
  assert.doesNotMatch(mapHtml, /id="recordMatrix"/);
  assert.doesNotMatch(mapHtml, /id="sharingMatrix"/);
  assert.doesNotMatch(mapHtml, /<details class="axis-card/);
  assert.doesNotMatch(mapHtml, /<details class="shared-callout"/);
  assert.match(mapHtml, /developer architecture/);
  assert.match(mapHtml, /\.architecture-diagram/);
  assert.match(mapHtml, /\.server-boundary-card/);
  assert.match(mapHtml, /\.database-cylinder/);
  assert.match(mapHtml, /\.hub-flow-node/);
  assert.match(mapHtml, /\.flow-selector-summary/);
  assert.match(mapHtml, /\.flow-detail-summary/);
  assert.match(mapHtml, /data-i18n="moduleRecordToggleLabel"/);
  assert.match(mapHtml, /class="flow-selector-body"/);
  assert.match(mapSource, /const dataFlows = \[/);
  assert.match(mapSource, /const sharedStorageGroups = \[/);
  assert.match(mapSource, /const appModuleRecordGroups = \[/);
  assert.match(mapSource, /selectedFlowId: 'audit-lux'/);
  assert.match(mapSource, /const graphAxes = \[/);
  assert.match(mapSource, /const graphLayout = \{/);
  assert.match(mapSource, /function renderArchitectureWeb\(flows\)/);
  assert.match(mapSource, /function getStorageTargets\(flow\)/);
  assert.match(mapSource, /function renderFlowHub\(flows, selectedId\)/);
  assert.match(mapSource, /function renderSharedGroups\(\)/);
  assert.match(mapSource, /function renderModuleRecordLayer\(\)/);
  assert.match(mapSource, /showModuleRecords: false/);
  assert.match(mapSource, /server-boundary-card/);
  assert.match(mapSource, /selector-hub-intro/);
  assert.match(mapSource, /storage-target-grid/);
  assert.match(mapSource, /hub-flow-node/);
  assert.match(mapSource, /<details class="shared-group-card/);
  assert.match(mapSource, /shared-card-body/);
  assert.match(mapSource, /module-record-cluster/);
  assert.match(mapSource, /data-flow-id/);
  assert.match(mapSource, /node-flags/);
  assert.match(mapSource, /flow-collaboration/);
  assert.match(mapSource, /record_key=audit_lux/);
  assert.match(mapSource, /record_key=data_equipment_history_card/);
  assert.match(mapSource, /record_key=work_history_records/);
  assert.match(mapSource, /module_key=util_metering/);
  assert.match(mapSource, /moduleKey: 'portal_data'/);
  assert.match(mapSource, /recordKey: 'audit_lux'/);
  assert.match(mapSource, /recordKey: 'audit_regulation'/);
  assert.match(mapSource, /recordKey: 'data_equipment_history_card'/);
  assert.match(mapSource, /recordKey: 'work_history_records'/);
  assert.match(mapSource, /moduleKey: 'work_runtime'/);
  assert.match(mapSource, /recordKey: 'work_team_calendar_team1_part1'/);
  assert.match(mapSource, /recordKey: 'work_team_calendar_overview'/);
  assert.match(mapSource, /moduleKey: 'util_metering'/);
  assert.match(mapSource, /recordKey: 'electric_v1'/);
  assert.match(mapSource, /recordKey: 'shared_store_v1'/);
  assert.match(mapSource, /util_production_daily_entries/);
  assert.match(mapSource, /ownerDomain=audit\.legal_facility/);
  assert.match(mapSource, /ownerDomain=data\.equipment_history/);
  assert.match(mapSource, /ownerDomain=metering\.billing_document/);
  assert.doesNotMatch(mapSource, /ownerDomain=util\.production\.archive/);
  assert.doesNotMatch(mapSource, /KPI_STORAGE_ROOT\/files\/첨부파일\/유틸리티\/원본 저장/);
  assert.doesNotMatch(mapSource, /fileCategory=source_archive/);
  assert.match(mapSource, /photoDocumentId \/ photoPreviewUrl \/ photoDownloadUrl/);
  assert.match(mapSource, /documents\[\]\.documentId \/ documents\[\]\.previewUrl \/ documents\[\]\.downloadUrl/);
  assert.match(mapSource, /attachmentSlots\.billing\.documentId \/ previewUrl \/ downloadUrl/);
  assert.match(mapSource, /원본 시트 파일은 저장하지 않음/);
  assert.match(mapSource, /생산량 기입 원본 파일은 app_documents에 저장하지 않음/);
  assert.match(mapSource, /app_module_records는 개인 PC 저장이 아니라 서버 공용 DB 레코드입니다/);
  assert.match(mapSource, /portal_data 공용 JSON 레코드/);
  assert.match(mapSource, /app_documents 이미지\/첨부 참조/);
  assert.match(mapSource, /저장 미연결/);

  assert.match(repositoryMapHtml, /historyServerSyncTitle/);
  assert.match(repositoryMapHtml, /data-reference-map\.html/);
  assert.match(repositoryMapHtml, /server sync/);
  assert.match(repositoryMapHtml, /Plant A\/Plant B/);
});
