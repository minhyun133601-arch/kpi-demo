(function initKpiWorkHistoryCoreRecords() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const {
        DATA_KEY,
        TEAM_KEYS,
        TeamInfo,
        ACTUAL_ACHIEVEMENT_RULES,
        RECORD_CATEGORY_GROUP_ORDER,
        RECORD_CATEGORY_GROUPS,
        RECORD_CATEGORY_ALIAS_MAP,
        RECORD_CATEGORY_OPTIONS,
        IMPORTANT_FLAG_LABEL,
        cloneJson
    } = history;

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(value);
        return div.innerHTML;
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/"/g, '&quot;');
    }

    function normalizeCost(value) {
        if (value === null || value === undefined || value === '') return null;
        const normalized = Number(String(value).replace(/,/g, ''));
        return Number.isFinite(normalized) ? normalized : null;
    }

    function normalizeAssignees(value) {
        const items = Array.isArray(value) ? value : String(value || '').split(/[\n,\/;]+/);
        return items.map(item => String(item || '').trim()).filter(Boolean);
    }

    function normalizeRecordCategoryAlias(value) {
        const rawValue = String(value || '').trim();
        if (!rawValue) return '';
        return RECORD_CATEGORY_ALIAS_MAP[rawValue] || rawValue;
    }

    function getRecordCategoryGroupKeyByCategory(value) {
        const normalizedCategory = normalizeRecordCategoryAlias(value);
        return RECORD_CATEGORY_GROUP_ORDER.find(groupKey => (
            RECORD_CATEGORY_GROUPS[groupKey]?.categories?.includes(normalizedCategory)
        )) || '';
    }

    function isAllowedRecordCategory(value) {
        return RECORD_CATEGORY_OPTIONS.includes(normalizeRecordCategoryAlias(value));
    }

    function normalizeRecordCategory(value, options = {}) {
        const rawValue = String(value || '').trim();
        if (!rawValue || rawValue === 'KPI' || rawValue === '없음') return '';
        const normalizedValue = normalizeRecordCategoryAlias(rawValue);
        if (isAllowedRecordCategory(normalizedValue)) return normalizedValue;
        return options.preserveLegacy === false ? '' : rawValue;
    }

    function normalizeRecordCategoryGroup(value, options = {}) {
        const rawValue = String(value || '').trim();
        const lowerValue = rawValue.toLowerCase();
        if (RECORD_CATEGORY_GROUPS[lowerValue]) {
            return lowerValue;
        }
        const matchedGroupKey = RECORD_CATEGORY_GROUP_ORDER.find(groupKey => (
            RECORD_CATEGORY_GROUPS[groupKey]?.label === rawValue
        ));
        if (matchedGroupKey) {
            return matchedGroupKey;
        }

        const categoryGroupKey = getRecordCategoryGroupKeyByCategory(options.category);
        if (categoryGroupKey) {
            return categoryGroupKey;
        }

        if (String(options.category || '').trim()) {
            return options.kpi === true ? 'kpi' : 'focus';
        }

        if (options.kpi === true) {
            return 'kpi';
        }

        return options.preserveLegacy === false ? '' : '';
    }

    function getRecordCategoryGroupOptions() {
        return RECORD_CATEGORY_GROUP_ORDER.map(groupKey => ({
            value: groupKey,
            label: RECORD_CATEGORY_GROUPS[groupKey]?.label || groupKey,
            categories: [...(RECORD_CATEGORY_GROUPS[groupKey]?.categories || [])]
        }));
    }

    function getRecordCategoryOptionsForGroup(groupKey, options = {}) {
        const normalizedGroupKey = normalizeRecordCategoryGroup(groupKey, options);
        const categories = normalizedGroupKey
            ? [...(RECORD_CATEGORY_GROUPS[normalizedGroupKey]?.categories || [])]
            : [];
        const legacyCategory = String(options.includeLegacyValue || '').trim();
        if (legacyCategory && !categories.includes(legacyCategory)) {
            categories.push(legacyCategory);
        }
        return categories;
    }

    function getRecordCategoryGroupLabel(recordOrGroupKey, options = {}) {
        const isRecordObject = recordOrGroupKey && typeof recordOrGroupKey === 'object';
        const groupKey = normalizeRecordCategoryGroup(
            isRecordObject ? (recordOrGroupKey.categoryGroup || recordOrGroupKey.categoryType || '') : recordOrGroupKey,
            {
                ...options,
                category: isRecordObject ? recordOrGroupKey.category : options.category,
                kpi: isRecordObject ? isKpiRecord(recordOrGroupKey) : options.kpi
            }
        );
        return groupKey ? (RECORD_CATEGORY_GROUPS[groupKey]?.label || '') : '';
    }

    function isReportRecord(record) {
        return normalizeRecordCategoryGroup(record?.categoryGroup || record?.categoryType, {
            category: record?.category,
            kpi: isKpiRecord(record)
        }) === 'report';
    }

    function normalizeAchievementText(value) {
        return String(value || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function isAchievementRecord(record) {
        const team = String(record?.team || '').trim();
        const startDate = String(record?.startDate || record?.date || record?.weekStart || '').trim();
        const endDate = String(record?.endDate || record?.date || record?.weekEnd || record?.weekStart || '').trim();
        const workContent = normalizeAchievementText(record?.workContent || record?.currentWork || '');
        if (!workContent) return false;
        return ACTUAL_ACHIEVEMENT_RULES.some((rule) => {
            if (rule.team && team !== rule.team) return false;
            if (rule.startDate && startDate !== rule.startDate) return false;
            if (rule.endDate && endDate !== rule.endDate) return false;
            return Array.isArray(rule.workIncludes)
                && rule.workIncludes.every(fragment => workContent.includes(normalizeAchievementText(fragment)));
        });
    }

    function isImportantRecord(record) {
        return isAchievementRecord(record);
    }

    function isKpiRecord(record) {
        const rawKpi = record?.kpi;
        const explicitKpi = rawKpi === true
            || rawKpi === 1
            || String(rawKpi || '').trim().toLowerCase() === 'true'
            || String(rawKpi || '').trim() === '1';
        if (explicitKpi) return true;
        return String(record?.category || '').trim() === 'KPI';
    }

    function getRecordTagLabels(record, options = {}) {
        const includeKpi = options.includeKpi !== false;
        const includeCategory = options.includeCategory !== false;
        const includeGroup = options.includeGroup !== false;
        const preserveLegacy = options.preserveLegacy !== false;
        const labels = [];
        if (includeKpi && isImportantRecord(record)) {
            labels.push(IMPORTANT_FLAG_LABEL);
        }
        const category = normalizeRecordCategory(record?.category, { preserveLegacy });
        if (includeCategory && category) {
            labels.push(category);
        } else if (includeGroup) {
            const groupLabel = getRecordCategoryGroupLabel(record, {
                category,
                kpi: isKpiRecord(record)
            });
            if (groupLabel) {
                labels.push(groupLabel);
            }
        }
        return labels;
    }

    function formatRecordTagText(record, options = {}) {
        return getRecordTagLabels(record, options).join(options.separator || ' · ');
    }

    function normalizeRecord(record, fallbackTeam) {
        const normalizeAttachmentSlots = history.normalizeAttachmentSlots;
        const flattenAttachmentSlots = history.flattenAttachmentSlots;
        const assignees = normalizeAssignees(record?.assignees || record?.assignee || record?.worker || '');
        const category = normalizeRecordCategory(record?.category);
        const categoryGroup = normalizeRecordCategoryGroup(
            record?.categoryGroup || record?.categoryType,
            {
                category: category || record?.category,
                kpi: isKpiRecord(record)
            }
        );
        const attachmentSlots = normalizeAttachmentSlots(
            record?.attachmentSlots || {
                billing: record?.billingAttachment || record?.billingDocument || null,
                report: record?.reportAttachment || record?.reportDocument || null
            },
            record?.attachments
        );
        return {
            team: TeamInfo[record?.team] ? String(record.team) : fallbackTeam,
            startDate: String(record?.startDate || record?.weekStart || record?.date || '').trim(),
            endDate: String(record?.endDate || record?.weekEnd || record?.date || record?.weekStart || '').trim(),
            plannedEndDate: String(record?.plannedEndDate || record?.expectedEndDate || '').trim(),
            categoryGroup,
            category,
            kpi: isKpiRecord(record),
            assignees,
            assignee: assignees.join(', '),
            workContent: String(record?.workContent || record?.currentWork || '').trim(),
            remarks: String(record?.remarks || '').trim(),
            attachmentSlots,
            billingAttachment: attachmentSlots.billing ? { ...attachmentSlots.billing } : null,
            reportAttachment: attachmentSlots.report ? { ...attachmentSlots.report } : null,
            attachments: flattenAttachmentSlots(attachmentSlots),
            cost: normalizeCost(record?.cost)
        };
    }

    function createDefaultPayload() {
        return {
            meta: {
                moduleKey: DATA_KEY,
                moduleName: '팀별내역서 - 작업내역',
                version: 1,
                updatedAt: new Date().toISOString()
            },
            teams: Object.fromEntries(TEAM_KEYS.map(team => [team, []]))
        };
    }

    function normalizePayload(payload) {
        const nextPayload = payload && typeof payload === 'object'
            ? cloneJson(payload)
            : createDefaultPayload();
        nextPayload.meta = nextPayload.meta && typeof nextPayload.meta === 'object'
            ? nextPayload.meta
            : {};
        nextPayload.meta.moduleKey = DATA_KEY;
        nextPayload.meta.moduleName = String(nextPayload.meta.moduleName || '팀별내역서 - 작업내역').trim();
        nextPayload.meta.version = Number(nextPayload.meta.version) || 1;
        nextPayload.meta.updatedAt = String(nextPayload.meta.updatedAt || new Date().toISOString()).trim();
        const sourceTeams = nextPayload.teams && typeof nextPayload.teams === 'object'
            ? nextPayload.teams
            : {};
        nextPayload.teams = Object.fromEntries(
            TEAM_KEYS.map(team => [
                team,
                Array.isArray(sourceTeams[team])
                    ? sourceTeams[team].map(record => normalizeRecord(record, team)).filter(record => record.startDate && record.endDate && record.team)
                    : []
            ])
        );
        return nextPayload;
    }

    Object.assign(history, {
        escapeHtml,
        escapeAttribute,
        normalizeCost,
        normalizeAssignees,
        normalizeRecordCategoryAlias,
        isAllowedRecordCategory,
        normalizeRecordCategory,
        normalizeRecordCategoryGroup,
        getRecordCategoryGroupOptions,
        getRecordCategoryOptionsForGroup,
        getRecordCategoryGroupLabel,
        isKpiRecord,
        isReportRecord,
        isAchievementRecord,
        isImportantRecord,
        getRecordTagLabels,
        formatRecordTagText,
        normalizeRecord,
        createDefaultPayload,
        normalizePayload
    });

    window.KpiWorkHistory = history;
})();
