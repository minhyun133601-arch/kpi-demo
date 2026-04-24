        function summarizeWorkTeamCalendarNote(note, maxLength = 40) {
            const compact = String(note || '').replace(/\s+/g, ' ').trim();
            if (!compact) return '';
            if (compact.length <= maxLength) return compact;
            return `${compact.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
        }

        function summarizeWorkTeamCalendarTitle(title, maxLength = 28) {
            const compact = String(title || '').replace(/\s+/g, ' ').trim();
            if (!compact) return '';
            if (compact.length <= maxLength) return compact;
            return `${compact.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
        }

        function formatWorkTeamCalendarFileDateToken(dateKey) {
            const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
            if (!match) return '';
            return `${String(match[1]).slice(-2)}.${match[2]}.${match[3]}`;
        }

        function sanitizeWorkTeamCalendarFileToken(value) {
            return String(value || '')
                .replace(/[\\/:*?"<>|]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 80);
        }

        function buildWorkTeamCalendarEntryTitle(dateKey, title) {
            const dateToken = formatWorkTeamCalendarFileDateToken(dateKey);
            const titleToken = sanitizeWorkTeamCalendarFileToken(title) || '제목없음';
            return `${dateToken} - ${titleToken}`.trim();
        }

        function buildWorkTeamCalendarAttachmentBaseName(dateKey, title, originalName = '') {
            const dateToken = formatWorkTeamCalendarFileDateToken(dateKey);
            const titleToken = sanitizeWorkTeamCalendarFileToken(title);
            if (titleToken) {
                return `${dateToken} - ${titleToken}`.trim();
            }
            const originalBase = String(originalName || '').replace(/\.[^.]+$/, '');
            const originalToken = sanitizeWorkTeamCalendarFileToken(originalBase) || '첨부파일';
            return `${dateToken} - ${originalToken}`.trim();
        }

        function getWorkTeamCalendarAttachmentPreviewLabel(dateKey, title) {
            const dateToken = formatWorkTeamCalendarFileDateToken(dateKey);
            const titleToken = sanitizeWorkTeamCalendarFileToken(title);
            return titleToken ? `${dateToken} - ${titleToken}`.trim() : `${dateToken} - 원본파일명`;
        }

        function hasWorkTeamCalendarDraftContent(draft) {
            const normalized = normalizeWorkTeamCalendarDraft(draft);
            return !!normalized.title.trim() || !!normalized.note.trim() || !!normalized.remark.trim() || normalized.members.length > 0 || normalized.attachments.length > 0;
        }

        function getWorkTeamCalendarMemberCountLabel(count) {
            return count > 0 ? `${count}명 선택` : '선택 없음';
        }

        function getWorkTeamCalendarMemberSummary(members) {
            const list = Array.isArray(members) ? members : [];
            if (!list.length) return '담당자 미선택';
            if (list.length === 1) return list[0];
            return `${list[0]} 외 ${list.length - 1}명`;
        }

        function getWorkTeamCalendarFocusSummary(draft) {
            const normalized = normalizeWorkTeamCalendarDraft(draft);
            const titleSummary = summarizeWorkTeamCalendarTitle(normalized.title, 36);
            const noteSummary = summarizeWorkTeamCalendarNote(normalized.note, 56);
            const attachmentSummary = normalized.attachments.length ? `첨부 ${normalized.attachments.length}건` : '';
            if (titleSummary && noteSummary && normalized.members.length) {
                return `${titleSummary} · ${noteSummary} · 담당 ${getWorkTeamCalendarMemberSummary(normalized.members)}`;
            }
            if (titleSummary && normalized.members.length && attachmentSummary) {
                return `${titleSummary} · 담당 ${getWorkTeamCalendarMemberSummary(normalized.members)} · ${attachmentSummary}`;
            }
            if (titleSummary && noteSummary) {
                return `${titleSummary} · ${noteSummary}`;
            }
            if (titleSummary) {
                return attachmentSummary ? `${titleSummary} · ${attachmentSummary}` : titleSummary;
            }
            if (noteSummary && normalized.members.length && attachmentSummary) {
                return `${noteSummary} · 담당 ${getWorkTeamCalendarMemberSummary(normalized.members)} · ${attachmentSummary}`;
            }
            if (noteSummary && normalized.members.length) {
                return `${noteSummary} · 담당 ${getWorkTeamCalendarMemberSummary(normalized.members)}`;
            }
            if (noteSummary) {
                return attachmentSummary ? `${noteSummary} · ${attachmentSummary}` : `${noteSummary} · 작업자와 비고를 이어서 입력할 수 있습니다.`;
            }
            if (normalized.members.length && attachmentSummary) {
                return `담당 ${getWorkTeamCalendarMemberSummary(normalized.members)} · ${attachmentSummary}`;
            }
            if (normalized.members.length) {
                return `담당 ${getWorkTeamCalendarMemberSummary(normalized.members)} · 작업 내용 입력 대기`;
            }
            if (attachmentSummary) {
                return `${attachmentSummary} · 작업 내용 입력 대기`;
            }
            return '날짜를 선택한 뒤 작업 내역 입력을 열어 작업자, 제목, 작업내용, 첨부파일, 비고를 기록할 수 있습니다.';
        }

        function getWorkTeamCalendarWorkStatus(draft, emptyLabel) {
            const normalized = normalizeWorkTeamCalendarDraft(draft);
            const titleSummary = summarizeWorkTeamCalendarTitle(normalized.title, 24);
            const noteSummary = summarizeWorkTeamCalendarNote(normalized.note, 42);
            if (titleSummary && noteSummary) return `${titleSummary} · ${noteSummary}`;
            if (titleSummary && normalized.attachments.length) return `${titleSummary} · 첨부 ${normalized.attachments.length}건`;
            if (titleSummary) return titleSummary;
            if (noteSummary && normalized.attachments.length) return `${noteSummary} · 첨부 ${normalized.attachments.length}건`;
            if (noteSummary) return noteSummary;
            if (normalized.members.length && normalized.attachments.length) return `${getWorkTeamCalendarMemberSummary(normalized.members)} · 첨부 ${normalized.attachments.length}건`;
            if (normalized.members.length) return `${getWorkTeamCalendarMemberSummary(normalized.members)} 선택`;
            if (normalized.attachments.length) return `첨부 ${normalized.attachments.length}건`;
            return emptyLabel || '작업 내역 미입력';
        }

        function summarizeWorkTeamCalendarProductionMetrics(items) {
            const list = Array.isArray(items) ? items : [];
            let totalAmount = 0;
            let weightedYieldSum = 0;
            let weightedYieldWeight = 0;
            let yieldSum = 0;
            let yieldCount = 0;
            let totalEquipmentCapa = 0;
            let hasEquipmentCapa = false;
            let utilizationSum = 0;
            let utilizationCount = 0;
            list.forEach(item => {
                const amount = parseUtilAmount(item?.amount);
                const moistureExcludedYield = parseUtilPercentAmount(item?.moistureExcludedYield);
                const equipmentCapa = parseUtilAmount(item?.equipmentCapa);
                const equipmentUtilization = parseUtilPercentAmount(item?.equipmentUtilization);
                if (Number.isFinite(amount)) totalAmount += amount;
                if (Number.isFinite(moistureExcludedYield)) {
                    yieldSum += moistureExcludedYield;
                    yieldCount += 1;
                    if (Number.isFinite(amount) && amount > 0) {
                        weightedYieldSum += moistureExcludedYield * amount;
                        weightedYieldWeight += amount;
                    }
                }
                if (Number.isFinite(equipmentCapa)) {
                    totalEquipmentCapa += equipmentCapa;
                    hasEquipmentCapa = true;
                }
                if (Number.isFinite(equipmentUtilization)) {
                    utilizationSum += equipmentUtilization;
                    utilizationCount += 1;
                }
            });
            let utilizationRate = null;
            if (hasEquipmentCapa && totalEquipmentCapa > 0) {
                utilizationRate = (totalAmount / totalEquipmentCapa) * 100;
            } else if (utilizationCount > 0) {
                utilizationRate = utilizationSum / utilizationCount;
            }
            let moistureExcludedYieldRate = null;
            if (weightedYieldWeight > 0) {
                moistureExcludedYieldRate = weightedYieldSum / weightedYieldWeight;
            } else if (yieldCount > 0) {
                moistureExcludedYieldRate = yieldSum / yieldCount;
            }
            return {
                count: list.length,
                totalAmount,
                moistureExcludedYieldRate,
                totalEquipmentCapa: hasEquipmentCapa ? totalEquipmentCapa : null,
                utilizationRate
            };
        }

        function formatWorkTeamCalendarCapaLabel(value) {
            const numeric = parseUtilAmount(value);
            if (!Number.isFinite(numeric)) return '';
            return `CAPA ${formatUtilNumber(numeric)}`;
        }

        function formatWorkTeamCalendarUtilizationLabel(value) {
            const numeric = parseUtilPercentAmount(value);
            if (!Number.isFinite(numeric)) return '';
            return `가동률 ${formatUtilNumber(numeric, 1)}%`;
        }

        function formatWorkTeamCalendarYieldLabel(value) {
            const numeric = parseUtilPercentAmount(value);
            if (!Number.isFinite(numeric)) return '';
            return `수율 ${formatUtilNumber(numeric, 1)}%`;
        }

        function getWorkTeamCalendarProductionMetricLine(summary) {
            const yieldLabel = formatWorkTeamCalendarYieldLabel(summary?.moistureExcludedYieldRate) || '수율 -';
            const capaLabel = formatWorkTeamCalendarCapaLabel(summary?.totalEquipmentCapa) || 'CAPA -';
            const utilizationLabel = formatWorkTeamCalendarUtilizationLabel(summary?.utilizationRate) || '가동률 -';
            return `${yieldLabel} · ${capaLabel} · ${utilizationLabel}`;
        }

        function getWorkTeamCalendarProductionCueLabel(summary) {
            const count = Number(summary?.count || 0);
            const totalAmount = Number(summary?.totalAmount || 0);
            if (count <= 0 && totalAmount <= 0) return '';
            const parts = [];
            if (totalAmount > 0) parts.push(`${formatUtilNumber(totalAmount, 0)}kg`);
            if (count > 0) parts.push(`${formatUtilNumber(count, 0)}품목`);
            return parts.join(' · ');
        }
