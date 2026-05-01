import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const modelSource = await fs.readFile(path.join(repoRoot, 'data-entry/runtime/data/equipment-history/KPI.data.equipment-history.model.js'), 'utf8');
const formSource = await fs.readFile(path.join(repoRoot, 'data-entry/runtime/data/equipment-history/KPI.data.equipment-history.form.js'), 'utf8');
const storageSource = await fs.readFile(path.join(repoRoot, 'data-entry/runtime/data/equipment-history/KPI.data.equipment-history.storage.js'), 'utf8');
const renderSource = await fs.readFile(path.join(repoRoot, 'data-entry/runtime/data/equipment-history/KPI.data.equipment-history.render.js'), 'utf8');
const bridgeSource = await fs.readFile(path.join(repoRoot, 'data-entry/runtime/data/KPI.data.runtime.js'), 'utf8');
const kpiHtml = await fs.readFile(path.join(repoRoot, 'KPI.html'), 'utf8');

function createEquipmentHistoryRuntime() {
  const container = {
    innerHTML: '',
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };

  let registeredRenderer = null;
  const context = {
    console,
    document: {
      getElementById(id) {
        return id === 'content-container' ? container : null;
      },
    },
    KpiRuntime: {
      canUseServerWrite(writeEnabled) {
        return writeEnabled === true;
      },
      registerSectionRenderer(scope, renderer) {
        if (scope === 'data') registeredRenderer = renderer;
      },
    },
    PortalData: {},
    FileReader: class FileReader {},
    alert() {},
    print() {},
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    Map,
    Set,
  };

  context.window = context;
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(modelSource, context, { filename: 'KPI.data.equipment-history.model.js' });
  vm.runInContext(formSource, context, { filename: 'KPI.data.equipment-history.form.js' });
  vm.runInContext(storageSource, context, { filename: 'KPI.data.equipment-history.storage.js' });
  vm.runInContext(renderSource, context, { filename: 'KPI.data.equipment-history.render.js' });
  vm.runInContext(bridgeSource, context, { filename: 'KPI.data.runtime.js' });

  assert.equal(typeof registeredRenderer, 'function', 'data section renderer must be registered');
  return { context, container, registeredRenderer };
}

test('kpi html loads equipment-history modules before the data runtime bridge', () => {
  const modelIndex = kpiHtml.indexOf('data-entry/runtime/data/equipment-history/KPI.data.equipment-history.model.js?v=1');
  const formIndex = kpiHtml.indexOf('data-entry/runtime/data/equipment-history/KPI.data.equipment-history.form.js?v=1');
  const storageIndex = kpiHtml.indexOf('data-entry/runtime/data/equipment-history/KPI.data.equipment-history.storage.js?v=1');
  const renderIndex = kpiHtml.indexOf('data-entry/runtime/data/equipment-history/KPI.data.equipment-history.render.js?v=1');
  const bridgeIndex = kpiHtml.indexOf('data-entry/runtime/data/KPI.data.runtime.js?v=3');

  assert.ok(modelIndex >= 0, 'equipment-history model loader is missing');
  assert.ok(formIndex > modelIndex, 'equipment-history form loader must load after the model');
  assert.ok(storageIndex > formIndex, 'equipment-history storage loader must load after the form');
  assert.ok(renderIndex > storageIndex, 'equipment-history render loader must load after storage');
  assert.ok(bridgeIndex > renderIndex, 'data runtime bridge must load after equipment-history modules');
});

test('equipment-history renderer shows the empty board state and supports authoring records', () => {
  const { context, container, registeredRenderer } = createEquipmentHistoryRuntime();
  const api = context.KpiDataEquipmentHistory;

  registeredRenderer(
    { title: '설비 이력 카드', dataKey: 'data_equipment_history_card' },
    { container },
    {
      header: { title: '설비 이력 카드', brandName: 'KPI', brandSub: '설비 이력 관리 기록' },
      equipmentList: [],
    }
  );

  assert.match(container.innerHTML, /설비 현황/);
  assert.match(container.innerHTML, /설비 이력 카드 작성/);
  assert.match(container.innerHTML, /등록된 설비 카드가 없습니다/);

  const documentTableHtml = api.renderDocumentEditableTable([api.createBlankDocumentRow()]);
  assert.match(documentTableHtml, /문서명/);
  assert.match(documentTableHtml, /파일 첨부/);
  assert.match(documentTableHtml, /선택된 파일 없음/);
  assert.doesNotMatch(documentTableHtml, /첨부 키/);
  assert.doesNotMatch(documentTableHtml, /attachmentKey/);
  assert.doesNotMatch(documentTableHtml, /\?쒓굅|\?\?\?쒓굅|\?쓋굅/);

  const basicFieldHtml = api.renderFieldGrid(api.BASIC_FIELDS, api.createDraft(), 'data-equipment-edit-grid data-equipment-basic-grid');
  assert.match(basicFieldHtml, /설비명/);
  assert.match(basicFieldHtml, /관리팀/);
  assert.match(basicFieldHtml, /공정/);
  assert.match(basicFieldHtml, /가동률/);
  assert.doesNotMatch(basicFieldHtml, /설비코드/);
  assert.doesNotMatch(basicFieldHtml, /설비구분/);
  assert.doesNotMatch(basicFieldHtml, /담당/);
  assert.doesNotMatch(renderSource, /설비 운영 정보/);
  assert.doesNotMatch(renderSource, /data-equipment-status-select/);

  const record = api.buildRecordFromDraft({
    equipmentCode: 'EQ-MIX-001',
    name: '샘플 혼합기 A',
    team: '생산1팀',
    group: '혼합 공정',
    owner: '홍길동',
    status: '운영중',
    line: '라인 알파',
    process: '혼합',
    production: '2,680 kg',
    plan: '3,000 kg / 일',
    rate: '88',
    note: '설비 카드 작성 테스트',
    photoDocumentId: 'doc-photo-1',
    photoPreviewUrl: '/api/files/doc-photo-1/view',
    detailInfo: [{ label: '제조사', value: '샘플 제조사' }],
    maintenanceHistory: [{ date: '2026.04.29', type: '정기점검', content: '구동부 점검', worker: '홍길동', note: '정상' }],
    documents: [{ title: '점검 보고서', attachmentKey: 'legacy-key', documentId: 'doc-attachment-1', fileName: 'eq-mix-001-report.pdf', downloadUrl: '/api/files/doc-attachment-1/download' }],
  });

  assert.equal(record.equipmentCode, 'EQ-MIX-001');
  assert.equal(record.group, '혼합');
  assert.equal(record.status, '운영중');
  assert.equal(record.photoDataUrl, '');
  assert.equal(record.photoDocumentId, 'doc-photo-1');
  assert.equal(record.documents[0].documentId, 'doc-attachment-1');
  assert.equal(record.documents[0].attachmentKey, undefined);
  assert.equal(record.operationInfo.map((item) => item.label).join(','), '설비명,관리팀,공정,가동률');
  assert.ok(record.detailInfo.some((item) => item.label === '공정' && item.value === '혼합'));
  assert.ok(!record.detailInfo.some((item) => item.label === '설비코드'));
  assert.ok(!record.detailInfo.some((item) => item.label === '담당'));
  assert.ok(record.detailInfo.some((item) => item.label === '제조사' && item.value === '샘플 제조사'));
});

test('equipment-history save confirms payload persistence before publishing uploaded assets', () => {
  assert.match(storageSource, /async function deleteEquipmentHistoryUploadedDraftAssets/);
  assert.match(storageSource, /collectEquipmentHistoryDraftDocumentIds/);
  assert.match(renderSource, /const savedPayload = await api\.saveEquipmentHistoryPayload\?\.\(nextPayload\)/);
  assert.match(renderSource, /deleteEquipmentHistoryUploadedDraftAssets\?\.\(draft, previousDocumentIds\)/);
  assert.match(renderSource, /Object\.assign\(data, nextPayload\)/);
});
