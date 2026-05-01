        function isAuditLegalFacilityDataKey(dataKey) {
            return String(dataKey || '').trim() === 'audit_legal_facility';
        }
        const AUDIT_LEGAL_CATEGORY_OPTIONS = [
            { value: 'boiler', label: '보일러', icon: 'fa-fire-flame-simple' },
            { value: 'cooling', label: '냉동기', icon: 'fa-snowflake' },
            { value: 'gas', label: '가스', icon: 'fa-gas-pump' },
            { value: 'electric', label: '전기', icon: 'fa-bolt' },
            { value: 'fire', label: '소방', icon: 'fa-fire-extinguisher' },
            { value: 'pressure', label: '압력용기', icon: 'fa-gauge-high' }
        ];

        const AUDIT_LEGAL_CATEGORY_PRESETS = {
            boiler: {
                facility: '보일러 1호기',
                managementNo: 'BLR-01',
                plant: '보일러실',
                statutoryItem: '보일러 안전검사',
                cycle: '6개월',
                lastDate: '2026-01-10',
                nextDate: '2026-07-10',
                responsible: '시설팀',
                agency: '검사기관명',
                attachmentKey: 'boiler-01-202607-cert',
                note: '특이사항 없음'
            },
            cooling: {
                facility: '냉동기 1호기',
                managementNo: 'REF-01',
                plant: '냉동기계실',
                statutoryItem: '냉동제조시설 검사',
                cycle: '1년',
                lastDate: '2026-02-01',
                nextDate: '2027-02-01',
                responsible: '시설팀',
                agency: '검사기관명',
                attachmentKey: 'refrigerator-01-202702-cert',
                note: ''
            },
            gas: {
                facility: 'LPG 저장탱크',
                managementNo: 'GAS-TANK-01',
                plant: '가스저장소',
                statutoryItem: '가스시설 정기검사',
                cycle: '1년',
                lastDate: '2026-03-05',
                nextDate: '2027-03-05',
                responsible: '안전팀',
                agency: '검사기관명',
                attachmentKey: 'gas-tank-01-202703-cert',
                note: ''
            },
            electric: {
                facility: '수전설비',
                managementNo: 'ELEC-01',
                plant: '전기실',
                statutoryItem: '전기안전검사',
                cycle: '1년',
                lastDate: '2026-04-01',
                nextDate: '2027-04-01',
                responsible: '전기담당',
                agency: '검사기관명',
                attachmentKey: 'electric-01-202704-cert',
                note: ''
            },
            fire: {
                facility: '소방수신반',
                managementNo: 'FIRE-01',
                plant: '방재실',
                statutoryItem: '소방 작동점검',
                cycle: '1년',
                lastDate: '2026-05-01',
                nextDate: '2027-05-01',
                responsible: '안전팀',
                agency: '점검업체명',
                attachmentKey: 'fire-01-202705-report',
                note: ''
            },
            pressure: {
                facility: '압력용기 1호기',
                managementNo: 'PRS-01',
                plant: '유틸리티실',
                statutoryItem: '압력용기 정기검사',
                cycle: '2년',
                lastDate: '2026-06-01',
                nextDate: '2028-06-01',
                responsible: '보전팀',
                agency: '검사기관명',
                attachmentKey: 'pressure-01-202806-cert',
                note: ''
            }
        };

        function normalizeAuditLegalItemType(value) {
            const raw = String(value || 'other').trim().toLowerCase();
            if (raw === 'gasboiler') return 'boiler';
            if (raw === 'refrigerator' || raw === 'refrigeration') return 'cooling';
            if (raw === 'pressure-vessel' || raw === 'pressurevessel') return 'pressure';
            return raw || 'other';
        }

        function normalizeAuditLegalFacilities(data) {
            const source = Array.isArray(data?.facilities)
                ? data.facilities
                : (Array.isArray(data?.entries) ? data.entries : []);
            return source
                .map((item, index) => ({
                    id: String(item?.id || `legal-facility-${index + 1}`).trim(),
                    plant: String(item?.plant || item?.team || '').trim(),
                    managementNo: String(item?.managementNo || item?.equipmentCode || item?.code || '').trim(),
                    facility: String(item?.facility || item?.equipment || item?.name || '').trim(),
                    itemType: normalizeAuditLegalItemType(item?.itemType || item?.type || 'other'),
                    statutoryItem: String(item?.statutoryItem || item?.inspection || item?.category || '').trim(),
                    responsible: String(item?.responsible || item?.owner || '').trim(),
                    agency: String(item?.agency || item?.organization || '').trim(),
                    cycle: String(item?.cycle || item?.period || '').trim(),
                    lastDate: String(item?.lastDate || item?.lastInspectionDate || '').trim(),
                    nextDate: String(item?.nextDate || item?.nextInspectionDate || item?.dueDate || '').trim(),
                    documentStatus: String(item?.documentStatus || item?.statusText || '').trim(),
                    attachmentKey: String(item?.attachmentKey || item?.documentKey || '').trim(),
                    previewTitle: String(item?.previewTitle || item?.documentTitle || '').trim(),
                    note: String(item?.note || '').trim()
                }))
                .filter((item) => item.facility || item.statutoryItem);
        }
        function parseAuditLegalDate(value) {
            const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!match) return null;
            const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
            return Number.isNaN(date.getTime()) ? null : date;
        }
        function formatAuditLegalDate(value) {
            const date = parseAuditLegalDate(value);
            if (!date) return '-';
            return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        }
        function getAuditLegalDaysLeft(value, now = new Date()) {
            const dueDate = parseAuditLegalDate(value);
            if (!dueDate) return null;
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        }
        function getAuditLegalStatus(daysLeft) {
            if (daysLeft === null || daysLeft === undefined) return { key: 'none', label: '일정 없음', rowClass: '', dayClass: '' };
            if (daysLeft < 0) return { key: 'overdue', label: '기한 초과', rowClass: 'is-overdue', dayClass: 'is-overdue' };
            if (daysLeft <= 45) return { key: 'near', label: '임박', rowClass: 'is-near', dayClass: 'is-near' };
            return { key: 'safe', label: '정상', rowClass: '', dayClass: '' };
        }
        function sanitizeAuditLegalClass(value, fallback = 'other') {
            return String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || fallback;
        }
        function getAuditLegalIconClass(value, fallback = 'fa-clipboard-check') {
            const raw = String(value || fallback).trim().replace(/^fa[srldb]?\s+/, '').replace(/^fa-/, '');
            const safe = raw.toLowerCase().replace(/[^a-z0-9-]/g, '') || fallback.replace(/^fa-/, '');
            return `fas fa-${safe}`;
        }
        function getAuditLegalItemMeta(itemType) {
            const type = normalizeAuditLegalItemType(itemType);
            const meta = {
                boiler: { icon: 'fa-fire-flame-simple', label: '보일러' },
                gas: { icon: 'fa-gas-pump', label: '가스' },
                pressure: { icon: 'fa-gauge-high', label: '압력용기' },
                fire: { icon: 'fa-fire-extinguisher', label: '소방' },
                environment: { icon: 'fa-seedling', label: '환경' },
                electric: { icon: 'fa-bolt', label: '전기' },
                gasboiler: { icon: 'fa-fire-flame-simple', label: '보일러' },
                cooling: { icon: 'fa-snowflake', label: '냉동' },
                other: { icon: 'fa-clipboard-check', label: '기타' }
            }[type] || { icon: 'fa-clipboard-check', label: '기타' };
            return { type: sanitizeAuditLegalClass(type), icon: meta.icon, label: meta.label };
        }
        function renderAuditLegalItemBadge(itemType) {
            const meta = getAuditLegalItemMeta(itemType);
            return `<span class="audit-legal-item-badge ${escapeHtml(meta.type)}"><i class="${getAuditLegalIconClass(meta.icon)}"></i>${escapeHtml(meta.label)}</span>`;
        }
        function renderAuditLegalDaysBadge(daysLeft, status) {
            const label = daysLeft === null || daysLeft === undefined
                ? '-'
                : (daysLeft < 0 ? `D+${Math.abs(daysLeft)}` : `D-${daysLeft}`);
            return `<span class="audit-legal-days ${status.dayClass}">${escapeHtml(label)}</span>`;
        }
        function normalizeAuditLegalMetricList(source) {
            if (!Array.isArray(source)) return [];
            return source
                .map((item) => {
                    if (Array.isArray(item)) {
                        return { label: String(item[0] || '').trim(), value: String(item[1] ?? '').trim() };
                    }
                    return {
                        label: String(item?.label || item?.name || '').trim(),
                        value: String(item?.value ?? item?.count ?? '').trim()
                    };
                })
                .filter((item) => item.label);
        }
        function normalizeAuditLegalStatusList(source) {
            if (!Array.isArray(source)) return [];
            return source
                .map((item) => ({
                    key: sanitizeAuditLegalClass(item?.key || item?.type || 'safe', 'safe'),
                    label: String(item?.label || '').trim(),
                    count: String(item?.count ?? item?.value ?? '').trim()
                }))
                .filter((item) => item.label);
        }
        function summarizeAuditLegalRecords(records) {
            return records.reduce((acc, item) => {
                acc.total += 1;
                acc[item.status.key] = (acc[item.status.key] || 0) + 1;
                return acc;
            }, { total: 0, overdue: 0, near: 0, safe: 0 });
        }
        function buildAuditLegalEquipmentMetrics(records) {
            const counts = summarizeAuditLegalRecords(records);
            return [
                { label: '등록 설비', value: String(counts.total) },
                { label: '45일 이내', value: String(counts.near) },
                { label: '기한 초과', value: String(counts.overdue) }
            ];
        }
        function buildAuditLegalEquipmentStatuses(records) {
            const counts = summarizeAuditLegalRecords(records);
            return [
                { key: 'danger', label: '초과', count: String(counts.overdue) },
                { key: 'warning', label: '임박', count: String(counts.near) },
                { key: 'safe', label: '정상', count: String(counts.safe) }
            ].filter((item) => item.count !== '0');
        }
        function normalizeAuditLegalEquipment(data, records) {
            if (Array.isArray(data?.equipment)) {
                return data.equipment
                    .map((item, index) => {
                        const meta = getAuditLegalItemMeta(item?.itemType || item?.type);
                        const itemType = normalizeAuditLegalItemType(item?.itemType || item?.type || meta.type);
                        const typeRecords = records.filter((record) => normalizeAuditLegalItemType(record.itemType) === itemType);
                        return {
                            id: String(item?.id || `legal-equipment-${index + 1}`).trim(),
                            title: String(item?.title || item?.name || meta.label).trim(),
                            itemType: sanitizeAuditLegalClass(itemType),
                            icon: String(item?.icon || meta.icon).trim(),
                            metrics: buildAuditLegalEquipmentMetrics(typeRecords),
                            statuses: buildAuditLegalEquipmentStatuses(typeRecords)
                        };
                    })
                    .filter((item) => item.title);
            }
            const grouped = records.reduce((acc, item) => {
                const meta = getAuditLegalItemMeta(item.itemType);
                if (!acc[meta.type]) {
                    acc[meta.type] = { meta, total: 0, overdue: 0, near: 0, safe: 0 };
                }
                acc[meta.type].total += 1;
                acc[meta.type][item.status.key] = (acc[meta.type][item.status.key] || 0) + 1;
                return acc;
            }, {});
            return Object.values(grouped).map((group) => ({
                id: `derived-${group.meta.type}`,
                title: group.meta.label,
                itemType: group.meta.type,
                icon: group.meta.icon,
                metrics: [
                    { label: '설비 수', value: String(group.total) },
                    { label: '확인 필요', value: String(group.overdue + group.near) },
                    { label: '정상', value: String(group.safe) }
                ],
                statuses: [
                    { key: 'safe', label: '정상', count: String(group.safe) },
                    { key: 'warning', label: '임박', count: String(group.near) },
                    { key: 'danger', label: '초과', count: String(group.overdue) }
                ].filter((item) => item.count !== '0')
            }));
        }
        function resolveAuditLegalCount(value, counts) {
            if (value === 0) return '0';
            if (value === null || value === undefined) return '';
            const key = String(value || '').trim();
            if (!key) return '';
            if (Object.prototype.hasOwnProperty.call(counts, key)) return String(counts[key]);
            return key;
        }
        function normalizeAuditLegalAlerts(data, counts) {
            const source = Array.isArray(data?.alerts) ? data.alerts : [];
            if (source.length) {
                return source
                    .map((item, index) => ({
                        id: String(item?.id || `legal-alert-${index + 1}`).trim(),
                        title: String(item?.title || '').trim(),
                        count: resolveAuditLegalCount(item?.count ?? item?.countKey, counts),
                        unit: String(item?.unit || '건').trim(),
                        icon: String(item?.icon || 'fa-triangle-exclamation').trim(),
                        severity: sanitizeAuditLegalClass(item?.severity || item?.type || 'danger', 'danger')
                    }))
                    .filter((item) => item.title);
            }
            if (!counts.total) return [];
            return [
                { id: 'derived-near', title: '45일 이내 점검', count: String(counts.near), unit: '건', icon: 'fa-calendar-day', severity: 'danger' },
                { id: 'derived-overdue', title: '기한 초과 항목', count: String(counts.overdue), unit: '건', icon: 'fa-triangle-exclamation', severity: 'danger' },
                { id: 'derived-docs', title: '문서 확인 필요', count: String(counts.overdue + counts.near), unit: '건', icon: 'fa-file-circle-check', severity: 'info' }
            ];
        }
        function normalizeAuditLegalDocuments(data, records) {
            const source = Array.isArray(data?.docs)
                ? data.docs
                : (Array.isArray(data?.documents) ? data.documents : []);
            if (source.length) {
                return source
                    .map((item, index) => ({
                        id: String(item?.id || `legal-doc-${index + 1}`).trim(),
                        title: String(item?.title || '').trim(),
                        icon: String(item?.icon || 'fa-file-lines').trim(),
                        uploaded: Number(item?.uploaded || 0),
                        missing: Number(item?.missing || 0),
                        rate: Math.max(0, Math.min(100, Number(item?.rate || 0)))
                    }))
                    .filter((item) => item.title);
            }
            if (!records.length) return [];
            const ready = records.filter((item) => item.attachmentKey || /ready|complete|monitoring|scheduled|첨부|등록|완료|정상/i.test(item.documentStatus)).length;
            const missing = Math.max(0, records.length - ready);
            const rate = records.length ? Math.round((ready / records.length) * 100) : 0;
            return [
                { id: 'derived-cert', title: '점검 증빙 문서', icon: 'fa-file-lines', uploaded: ready, missing, rate },
                { id: 'derived-action', title: '보완 조치 기록', icon: 'fa-clipboard-check', uploaded: Math.max(0, ready - 1), missing: missing + 1, rate: Math.max(0, rate - 10) }
            ];
        }
        function normalizeAuditLegalEvents(data, records) {
            const source = Array.isArray(data?.events) && data.events.length
                ? data.events
                : records.map((item) => ({
                    date: item.nextDate,
                    title: `${item.facility || '설비'} ${item.statutoryItem || '점검'}`,
                    type: item.status.key === 'overdue' ? 'deadline' : (item.status.key === 'near' ? 'inspection' : 'document')
                }));
            return source
                .map((item, index) => ({
                    id: String(item?.id || `legal-event-${index + 1}`).trim(),
                    date: String(item?.date || '').trim(),
                    title: String(item?.title || '').trim(),
                    type: sanitizeAuditLegalClass(item?.type || 'inspection', 'inspection')
                }))
                .filter((item) => parseAuditLegalDate(item.date) && item.title);
        }
        function getAuditLegalCalendarConfig(data, events) {
            const configuredYear = Number(data?.calendar?.year);
            const configuredMonth = Number(data?.calendar?.month);
            if (configuredYear && configuredMonth >= 1 && configuredMonth <= 12) {
                return {
                    year: configuredYear,
                    monthIndex: configuredMonth - 1,
                    label: String(data?.calendar?.label || `${configuredYear}년 ${configuredMonth}월`).trim()
                };
            }
            const firstEvent = events.map((item) => parseAuditLegalDate(item.date)).find(Boolean) || new Date();
            return {
                year: firstEvent.getFullYear(),
                monthIndex: firstEvent.getMonth(),
                label: `${firstEvent.getFullYear()}년 ${firstEvent.getMonth() + 1}월`
            };
        }
        function getAuditLegalCategoryPreset(itemType = 'boiler') {
            const normalized = normalizeAuditLegalItemType(itemType);
            return {
                itemType: normalized,
                ...(AUDIT_LEGAL_CATEGORY_PRESETS[normalized] || AUDIT_LEGAL_CATEGORY_PRESETS.boiler)
            };
        }
        function renderAuditLegalCategoryOptions(selectedType) {
            return AUDIT_LEGAL_CATEGORY_OPTIONS.map((item) => `
                <option value="${escapeHtml(item.value)}"${item.value === selectedType ? ' selected' : ''}>${escapeHtml(item.label)}</option>
            `).join('');
        }
        function renderAuditLegalEntryField(field, draft) {
            const value = draft[field.key] || '';
            if (field.type === 'select') {
                return `
                    <label class="audit-legal-entry-field">
                        <span>${escapeHtml(field.label)}</span>
                        <select data-audit-legal-input="${escapeHtml(field.key)}">
                            ${renderAuditLegalCategoryOptions(draft.itemType)}
                        </select>
                    </label>
                `;
            }
            const inputType = field.type || 'text';
            return `
                <label class="audit-legal-entry-field ${field.wide ? 'wide' : ''}">
                    <span>${escapeHtml(field.label)}</span>
                    <input type="${escapeHtml(inputType)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}" data-audit-legal-input="${escapeHtml(field.key)}"${field.required ? ' required' : ''}>
                </label>
            `;
        }
        function renderAuditLegalEntryForm() {
            const draft = getAuditLegalCategoryPreset('boiler');
            const fields = [
                { key: 'itemType', label: '분류', type: 'select' },
                { key: 'facility', label: '설비명', placeholder: '예: 보일러 1호기', required: true },
                { key: 'managementNo', label: '관리번호', placeholder: '예: BLR-01' },
                { key: 'plant', label: '위치', placeholder: '예: 보일러실' },
                { key: 'statutoryItem', label: '법정 항목', placeholder: '예: 보일러 안전검사', required: true },
                { key: 'cycle', label: '점검 주기', placeholder: '예: 6개월' },
                { key: 'lastDate', label: '최근 점검일', type: 'date' },
                { key: 'nextDate', label: '다음 점검일', type: 'date' },
                { key: 'responsible', label: '담당', placeholder: '예: 시설팀' },
                { key: 'agency', label: '점검기관', placeholder: '예: 검사기관명' },
                { key: 'attachmentKey', label: '첨부 키', placeholder: '예: boiler-01-202607-cert' },
                { key: 'note', label: '비고', placeholder: '예: 특이사항 없음', wide: true }
            ];
            return `
                <div class="audit-ref-card audit-legal-entry-card">
                    <div class="audit-ref-title">법정설비 등록</div>
                    <form class="audit-legal-entry-form mt-3" data-audit-legal-form>
                        <div class="audit-legal-entry-grid">
                            ${fields.map((field) => renderAuditLegalEntryField(field, draft)).join('')}
                        </div>
                        ${window.KpiAuditLegalAssets?.renderEntryAssetFields?.() || ''}
                        <div class="audit-legal-entry-actions">
                            <button type="submit" class="audit-legal-entry-primary">추가</button>
                            <button type="button" data-audit-legal-example>예시 다시 채우기</button>
                            <button type="reset">비우기</button>
                        </div>
                    </form>
                </div>
            `;
        }
        function renderAuditLegalEquipmentCards(cards) {
            if (!cards.length) {
                return '<div class="audit-legal-empty">표시할 설비 카드가 없습니다.</div>';
            }
            return cards.map((item) => {
                const metricsHtml = item.metrics.map((metric) => `
                    <div class="audit-legal-metric-row"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value || '-')}</strong></div>
                `).join('');
                const statusesHtml = item.statuses.map((status) => `
                    <span class="audit-legal-status-token ${escapeHtml(status.key)}"><i></i>${escapeHtml(status.label)} ${escapeHtml(status.count)}</span>
                `).join('');
                return `
                    <article class="audit-legal-equipment-card" data-audit-legal-category="${escapeHtml(item.itemType)}" role="button" tabindex="0">
                        <div class="audit-legal-equipment-top">
                            <span class="audit-legal-equipment-icon ${escapeHtml(item.itemType)}"><i class="${getAuditLegalIconClass(item.icon)}"></i></span>
                            <strong class="audit-legal-equipment-title">${escapeHtml(item.title)}</strong>
                        </div>
                        <div class="audit-legal-metric-list">${metricsHtml}</div>
                        <div class="audit-legal-status-line">${statusesHtml}</div>
                    </article>
                `;
            }).join('');
        }
        function renderAuditLegalAlerts(alerts) {
            if (!alerts.length) {
                return '<div class="audit-legal-empty">표시할 알림이 없습니다.</div>';
            }
            return alerts.map((item) => `
                <article class="audit-legal-alert-card ${escapeHtml(item.severity)}">
                    <span class="audit-legal-alert-icon"><i class="${getAuditLegalIconClass(item.icon)}"></i></span>
                    <span class="audit-legal-alert-copy">
                        <strong>${escapeHtml(item.title)}</strong>
                        <span>${escapeHtml(item.count || '0')}${escapeHtml(item.unit || '건')}</span>
                    </span>
                </article>
            `).join('');
        }
        function renderAuditLegalDocuments(documents) {
            if (!documents.length) {
                return '<div class="audit-legal-empty">표시할 문서 현황이 없습니다.</div>';
            }
            return documents.map((item) => `
                <article class="audit-legal-doc-card">
                    <span class="audit-legal-doc-icon"><i class="${getAuditLegalIconClass(item.icon)}"></i></span>
                    <div class="audit-legal-doc-copy">
                        <strong>${escapeHtml(item.title)}</strong>
                        <span>업로드 ${escapeHtml(String(item.uploaded))}건 / 미업로드 ${escapeHtml(String(item.missing))}건</span>
                        <div class="audit-legal-doc-progress" aria-hidden="true"><i style="width:${escapeHtml(String(item.rate))}%"></i></div>
                    </div>
                    <span class="audit-legal-doc-rate">${escapeHtml(String(item.rate))}%</span>
                </article>
            `).join('');
        }
        function renderAuditLegalCalendar(data, events) {
            const calendar = getAuditLegalCalendarConfig(data, events);
            const firstDay = new Date(calendar.year, calendar.monthIndex, 1).getDay();
            const daysInMonth = new Date(calendar.year, calendar.monthIndex + 1, 0).getDate();
            const daysInPrevMonth = new Date(calendar.year, calendar.monthIndex, 0).getDate();
            const eventMap = events.reduce((acc, item) => {
                acc[item.date] = acc[item.date] || [];
                acc[item.date].push(item);
                return acc;
            }, {});
            const pad = (value) => String(value).padStart(2, '0');
            const makeDateKey = (year, monthIndex, day) => `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
            const cells = [];
            for (let i = firstDay; i > 0; i -= 1) {
                const day = daysInPrevMonth - i + 1;
                const date = new Date(calendar.year, calendar.monthIndex - 1, day);
                cells.push({ day, muted: true, key: makeDateKey(date.getFullYear(), date.getMonth(), day) });
            }
            for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, muted: false, key: makeDateKey(calendar.year, calendar.monthIndex, day) });
            const targetLength = cells.length <= 35 ? 35 : 42;
            while (cells.length < targetLength) {
                const day = cells.length - firstDay - daysInMonth + 1;
                const date = new Date(calendar.year, calendar.monthIndex + 1, day);
                cells.push({ day, muted: true, key: makeDateKey(date.getFullYear(), date.getMonth(), day) });
            }
            const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
            const headerHtml = weekdays.map((day) => `<div class="audit-legal-weekday">${day}</div>`).join('');
            const cellHtml = cells.map((cell, index) => {
                const dayEvents = eventMap[cell.key] || [];
                const pills = dayEvents.slice(0, 2).map((event) => `
                    <span class="audit-legal-event-pill ${escapeHtml(event.type)}" title="${escapeHtml(event.title)}">${escapeHtml(event.title)}</span>
                `).join('');
                return `
                    <div class="audit-legal-calendar-cell ${cell.muted ? 'muted' : ''} ${index % 7 === 0 ? 'sunday' : ''}">
                        <span class="audit-legal-cell-day">${escapeHtml(String(cell.day))}</span>
                        ${pills}
                    </div>
                `;
            }).join('');
            return `
                <div class="audit-legal-calendar-head">
                    <strong>${escapeHtml(calendar.label)}</strong>
                    <span>점검 일정</span>
                </div>
                <div class="audit-legal-legend">
                    <span><i class="inspection"></i>점검</span>
                    <span><i class="deadline"></i>마감</span>
                    <span><i class="document"></i>문서</span>
                </div>
                <div class="audit-legal-calendar-grid">${headerHtml}${cellHtml}</div>
            `;
        }
        function getAuditLegalInputValue(form, key) {
            return String(form.querySelector(`[data-audit-legal-input="${key}"]`)?.value || '').trim();
        }
        function setAuditLegalInputValue(form, key, value) {
            const input = form.querySelector(`[data-audit-legal-input="${key}"]`);
            if (input) input.value = value || '';
        }
        function cloneAuditLegalData(value) {
            return JSON.parse(JSON.stringify(value || {}));
        }
        function restoreAuditLegalData(data, snapshot) {
            Object.keys(data || {}).forEach((key) => delete data[key]);
            Object.assign(data, cloneAuditLegalData(snapshot));
            if (window.PortalData) {
                window.PortalData.audit_legal_facility = cloneAuditLegalData(snapshot);
            }
        }
        function applyAuditLegalPreset(form, itemType) {
            const preset = getAuditLegalCategoryPreset(itemType);
            Object.entries(preset).forEach(([key, value]) => setAuditLegalInputValue(form, key, value));
        }
        function buildAuditLegalRecordFromForm(form) {
            const itemType = normalizeAuditLegalItemType(getAuditLegalInputValue(form, 'itemType'));
            const facility = getAuditLegalInputValue(form, 'facility');
            const statutoryItem = getAuditLegalInputValue(form, 'statutoryItem');
            if (!facility || !statutoryItem) return null;
            const attachmentKey = getAuditLegalInputValue(form, 'attachmentKey');
            const timestamp = Date.now();
            return {
                id: `legal-${itemType}-${timestamp}`,
                itemType,
                facility,
                managementNo: getAuditLegalInputValue(form, 'managementNo'),
                plant: getAuditLegalInputValue(form, 'plant'),
                statutoryItem,
                cycle: getAuditLegalInputValue(form, 'cycle'),
                lastDate: getAuditLegalInputValue(form, 'lastDate'),
                nextDate: getAuditLegalInputValue(form, 'nextDate'),
                responsible: getAuditLegalInputValue(form, 'responsible'),
                agency: getAuditLegalInputValue(form, 'agency'),
                attachmentKey,
                documentStatus: attachmentKey ? '첨부 키 등록' : '',
                previewTitle: attachmentKey || statutoryItem,
                note: getAuditLegalInputValue(form, 'note')
            };
        }
        function bindAuditLegalEntryEvents(category, data, contentContainer) {
            const form = contentContainer.querySelector('[data-audit-legal-form]');
            if (!form) return;
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const record = buildAuditLegalRecordFromForm(form);
                let savedRecord = record;
                if (!record) {
                    window.alert('설비명과 법정 항목을 입력해 주세요.');
                    return;
                }
                if (window.KpiAuditLegalAssets?.canWrite?.() !== true) {
                    window.alert('서버 저장 권한이 있어야 법정설비를 등록할 수 있습니다.');
                    return;
                }
                try {
                    savedRecord = await (window.KpiAuditLegalAssets?.attachFilesToRecord?.(record, form) || Promise.resolve(record));
                } catch (error) {
                    console.warn('[kpi] audit legal facility attachment upload failed', error);
                    window.alert('첨부 파일을 저장하지 못했습니다.');
                    return;
                }
                const previousData = cloneAuditLegalData(data);
                const nextData = cloneAuditLegalData(data);
                nextData.facilities = Array.isArray(nextData.facilities) ? nextData.facilities : [];
                nextData.facilities.unshift(savedRecord);
                let saved = false;
                try {
                    saved = typeof saveAuditData === 'function'
                        ? await Promise.resolve(saveAuditData('audit_legal_facility', nextData))
                        : false;
                } catch (saveError) {
                    console.warn('[kpi] audit legal facility save failed', saveError);
                    saved = false;
                }
                if (saved !== true) {
                    restoreAuditLegalData(data, previousData);
                    try {
                        await (window.KpiAuditLegalAssets?.deleteUploadedFilesFromRecord?.(savedRecord) || Promise.resolve(true));
                    } catch (cleanupError) {
                        console.warn('[kpi] audit legal facility attachment cleanup failed', cleanupError);
                    }
                    window.alert('서버 저장이 완료되지 않아 법정설비 등록을 취소했습니다.');
                    return;
                }
                Object.keys(data || {}).forEach((key) => delete data[key]);
                Object.assign(data, nextData);
                renderAuditLegalFacilityPreview(category, data);
            });
            form.querySelector('[data-audit-legal-input="itemType"]')?.addEventListener('change', (event) => {
                applyAuditLegalPreset(form, event.target.value);
            });
            form.querySelector('[data-audit-legal-example]')?.addEventListener('click', () => {
                applyAuditLegalPreset(form, getAuditLegalInputValue(form, 'itemType') || 'boiler');
            });
            contentContainer.querySelectorAll('[data-audit-legal-category]').forEach((card) => {
                const applyCategory = () => applyAuditLegalPreset(form, card.dataset.auditLegalCategory || 'boiler');
                card.addEventListener('click', applyCategory);
                card.addEventListener('keydown', (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    applyCategory();
                });
            });
        }
        function renderAuditLegalFacilityPreview(category, data) {
            const now = new Date();
            const records = normalizeAuditLegalFacilities(data)
                .map((item) => {
                    const daysLeft = getAuditLegalDaysLeft(item.nextDate, now);
                    const status = getAuditLegalStatus(daysLeft);
                    return { ...item, daysLeft, status };
                })
                .sort((a, b) => {
                    const aDays = a.daysLeft === null || a.daysLeft === undefined ? Number.POSITIVE_INFINITY : a.daysLeft;
                    const bDays = b.daysLeft === null || b.daysLeft === undefined ? Number.POSITIVE_INFINITY : b.daysLeft;
                    if (aDays !== bDays) return aDays - bDays;
                    return (a.facility || '').localeCompare(b.facility || '', 'ko');
                });
            const selected = records.find((item) => item.status.key === 'overdue' || item.status.key === 'near') || records[0] || null;
            const overdueCount = records.filter((item) => item.status.key === 'overdue').length;
            const nearCount = records.filter((item) => item.status.key === 'near').length;
            const safeCount = records.filter((item) => item.status.key === 'safe').length;
            const counts = {
                total: records.length,
                overdue: overdueCount,
                near: nearCount,
                safe: safeCount,
                needsReview: overdueCount + nearCount
            };
            const alarmSafe = overdueCount === 0 && nearCount === 0;
            const equipmentCards = normalizeAuditLegalEquipment(data, records);
            const alerts = normalizeAuditLegalAlerts(data, counts);
            const documents = normalizeAuditLegalDocuments(data, records);
            const events = normalizeAuditLegalEvents(data, records);
            const rowsHtml = records.length ? records.map((item) => `
                <tr class="${item.status.rowClass}">
                    <td>${renderAuditLegalItemBadge(item.itemType)}</td>
                    <td>
                        <strong>${escapeHtml(item.facility || '-')}</strong>
                        <div class="audit-ref-meta-sub">${escapeHtml(item.managementNo || '-')}</div>
                    </td>
                    <td>${escapeHtml(item.plant || '-')}</td>
                    <td>${escapeHtml(item.statutoryItem || '-')}</td>
                    <td>${escapeHtml(item.responsible || '-')}</td>
                    <td>${escapeHtml(item.agency || '-')}</td>
                    <td>${escapeHtml(item.cycle || '-')}</td>
                    <td class="is-date">${escapeHtml(formatAuditLegalDate(item.lastDate))}</td>
                    <td class="is-date">${escapeHtml(formatAuditLegalDate(item.nextDate))}</td>
                    <td>${renderAuditLegalDaysBadge(item.daysLeft, item.status)}</td>
                    <td>${escapeHtml(item.attachmentKey || item.documentStatus || item.status.label)}</td>
                </tr>
            `).join('') : `
                <tr>
                    <td colspan="11">
                        <div class="audit-legal-empty">등록된 법정 설비 점검 항목이 없습니다.</div>
                    </td>
                </tr>
            `;
            const previewHtml = selected ? `
                <div class="audit-lux-preview-card">
                    <div class="audit-lux-preview-head">
                        <div class="audit-lux-preview-copy">
                            <div class="audit-lux-preview-title">법정 설비 문서 프리뷰</div>
                            <div class="audit-lux-preview-meta">${escapeHtml(selected.previewTitle || selected.statutoryItem || '점검 문서')}</div>
                        </div>
                        ${renderAuditLegalDaysBadge(selected.daysLeft, selected.status)}
                    </div>
                    <div class="audit-lux-preview-stage">
                        <div class="audit-ref-preview">
                            <div class="audit-report-hero">
                                <div class="audit-report-hero-head">
                                    <div class="audit-report-hero-title">${escapeHtml(selected.facility || '-')}</div>
                                    <div class="audit-report-hero-sub">${escapeHtml(selected.plant || '-')} / ${escapeHtml(selected.agency || '-')}</div>
                                </div>
                                <div class="audit-report-kpis">
                                    <span class="audit-report-kpi">${escapeHtml(selected.status.label)}</span>
                                    <span class="audit-report-kpi">${escapeHtml(selected.cycle || '주기 미지정')}</span>
                                </div>
                            </div>
                            <table class="audit-table">
                                <tbody>
                                    <tr><th>법정 항목</th><td>${escapeHtml(selected.statutoryItem || '-')}</td></tr>
                                    <tr><th>최근 점검</th><td>${escapeHtml(formatAuditLegalDate(selected.lastDate))}</td></tr>
                                    <tr><th>다음 점검</th><td>${escapeHtml(formatAuditLegalDate(selected.nextDate))}</td></tr>
                                    <tr><th>담당</th><td>${escapeHtml(selected.responsible || '-')}</td></tr>
                                    <tr><th>첨부 키</th><td>${escapeHtml(selected.attachmentKey || selected.documentStatus || '-')}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="audit-lux-preview-foot">
                        <span class="audit-lux-preview-origin">${escapeHtml(selected.note || '법정 설비 점검 기록 프리뷰입니다.')}</span>
                    </div>
                </div>
            ` : `
                <div class="audit-lux-preview-card">
                    <div class="audit-lux-preview-empty">표시할 법정 설비 프리뷰가 없습니다.</div>
                </div>
            `;
            const contentContainer = document.getElementById('content-container');
            contentContainer.innerHTML = `
                <div class="border-b pb-4 mb-6">
                    <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span class="w-2 h-8 rounded-sm inline-block" style="background:${category.color || '#e11d48'};"></span>
                        ${escapeHtml(category.title || '법정 설비')}
                    </h2>
                    <p class="text-slate-500 mt-1 pl-4 text-sm">${escapeHtml(category.desc || '')}</p>
                </div>
                <div class="audit-panel audit-legal-wrap">
                    <div class="audit-section">
                        <div class="audit-section-header">
                            <div class="audit-section-title">
                                <span class="audit-section-icon"><i class="fas fa-scale-balanced"></i></span>
                                <span>법정 설비 점검 프리뷰</span>
                            </div>
                            <span class="audit-badge">총 ${records.length}건</span>
                        </div>
                        <div class="audit-section-body">
                            <div class="audit-legal-meta">
                                <span class="audit-legal-alarm ${alarmSafe ? 'is-safe' : ''}">
                                    <i class="fas ${alarmSafe ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
                                    ${alarmSafe ? '기한 임박 없음' : `확인 필요 ${overdueCount + nearCount}건`}
                                </span>
                                <div class="audit-legal-summary">
                                    <span class="audit-legal-chip warn">기한 초과 ${overdueCount}</span>
                                    <span class="audit-legal-chip warn">45일 이내 ${nearCount}</span>
                                    <span class="audit-legal-chip safe">정상 ${safeCount}</span>
                                </div>
                            </div>
                            <div class="audit-legal-dashboard">
                                <div class="audit-legal-main">
                                    <div class="audit-legal-equipment-grid">
                                        ${renderAuditLegalEquipmentCards(equipmentCards)}
                                    </div>
                                    ${renderAuditLegalEntryForm()}
                                    <div class="audit-legal-content-grid">
                                        <div class="audit-ref-card">
                                            <div class="audit-ref-title">점검 일정</div>
                                            <div class="mt-3">${renderAuditLegalCalendar(data, events)}</div>
                                        </div>
                                        <div class="audit-ref-card">
                                            <div class="audit-ref-title">법정 설비 목록</div>
                                            <div class="audit-legal-table-wrap mt-3">
                                                <table class="audit-legal-table">
                                                    <thead>
                                                        <tr>
                                                            <th>구분</th>
                                                            <th>설비</th>
                                                            <th>위치</th>
                                                            <th>법정 항목</th>
                                                            <th>담당</th>
                                                            <th>기관</th>
                                                            <th>주기</th>
                                                            <th>최근 점검</th>
                                                            <th>다음 점검</th>
                                                            <th>D-Day</th>
                                                            <th>첨부 키</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>${rowsHtml}</tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="audit-ref-card">
                                        <div class="audit-ref-title">문서 현황</div>
                                        <div class="audit-legal-doc-grid mt-3">
                                            ${renderAuditLegalDocuments(documents)}
                                        </div>
                                    </div>
                                </div>
                                <aside class="audit-legal-side" aria-label="법정 설비 알림과 프리뷰">
                                    <div class="audit-ref-card">
                                        <div class="audit-ref-title">중요 알림</div>
                                        <div class="audit-legal-alert-list mt-3">
                                            ${renderAuditLegalAlerts(alerts)}
                                        </div>
                                    </div>
                                    <div class="audit-ref-card">
                                        <div class="audit-ref-title">프리뷰</div>
                                        <div class="mt-3">${previewHtml}</div>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            bindAuditLegalEntryEvents(category, data, contentContainer);
        }
