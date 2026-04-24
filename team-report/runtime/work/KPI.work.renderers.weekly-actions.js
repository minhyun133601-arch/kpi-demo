        function rerenderWorkCategory(dataKey) {
            const category = getWorkCategory(dataKey);
            if (category) renderWorkContent(category);
            return category;
        }

        function cloneWorkExportPayload(data) {
            if (typeof cloneWorkDataPayload === 'function') {
                return cloneWorkDataPayload(data);
            }
            return JSON.parse(JSON.stringify(data || {}));
        }

        function buildWorkExportScript(dataKey, data) {
            const normalizedKey = String(dataKey || '').trim();
            if (!normalizedKey) return '';
            const payload = cloneWorkExportPayload(data);
            return [
                '(function bootstrapWorkPortalData(){',
                '    window.PortalData = window.PortalData || {};',
                `    window.PortalData[${JSON.stringify(normalizedKey)}] = ${JSON.stringify(payload, null, 4)};`,
                '})();',
                ''
            ].join('\n');
        }

        function getWorkExportFileName(dataKey) {
            const normalizedKey = String(dataKey || '').trim() || 'work-data';
            const dateLabel = new Date().toISOString().slice(0, 10);
            return `${normalizedKey}-${dateLabel}.js`;
        }

        async function workExport(dataKey) {
            const normalizedKey = String(dataKey || '').trim();
            if (!normalizedKey) return false;
            if (typeof waitForWorkServerWrite === 'function') {
                await waitForWorkServerWrite(normalizedKey);
            }
            const data = getWorkData(normalizedKey);
            const content = buildWorkExportScript(normalizedKey, data);
            if (!content) return false;
            const blob = new Blob([content], { type: 'application/javascript;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            try {
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = getWorkExportFileName(normalizedKey);
                anchor.style.display = 'none';
                document.body?.appendChild?.(anchor);
                anchor.click();
                anchor.remove?.();
                return true;
            } finally {
                URL.revokeObjectURL(url);
            }
        }

        function workSelect(dataKey, weekKey) {
            WorkState.activeWeek[dataKey] = weekKey;
            rerenderWorkCategory(dataKey);
        }

        function workPrev(dataKey) {
            const data = getWorkData(dataKey);
            const weeks = (data.weeks || []).slice().sort((a, b) => (a.year - b.year) || (a.week - b.week));
            const currentKey = WorkState.activeWeek[dataKey];
            const idx = weeks.findIndex(w => makeWeekKey(w.year, w.week) === currentKey);
            if (idx > 0) {
                WorkState.activeWeek[dataKey] = makeWeekKey(weeks[idx - 1].year, weeks[idx - 1].week);
                rerenderWorkCategory(dataKey);
            } else if (idx === 0 && weeks.length > 0) {
                const first = weeks[0];
                const prevStart = getWeekStartDate(first.year, first.week);
                prevStart.setDate(prevStart.getDate() - 7);
                const prevInfo = getISOWeekInfo(prevStart);
                ensureWeek(data, prevInfo.year, prevInfo.week);
                saveWorkData(dataKey, data);
                WorkState.activeWeek[dataKey] = makeWeekKey(prevInfo.year, prevInfo.week);
                rerenderWorkCategory(dataKey);
            }
        }

        function workNext(dataKey) {
            const data = getWorkData(dataKey);
            const weeks = (data.weeks || []).slice().sort((a, b) => (a.year - b.year) || (a.week - b.week));
            const currentKey = WorkState.activeWeek[dataKey];
            const idx = weeks.findIndex(w => makeWeekKey(w.year, w.week) === currentKey);
            if (idx >= 0 && idx < weeks.length - 1) {
                WorkState.activeWeek[dataKey] = makeWeekKey(weeks[idx + 1].year, weeks[idx + 1].week);
                rerenderWorkCategory(dataKey);
            } else if (idx === weeks.length - 1 && weeks.length > 0) {
                const last = weeks[weeks.length - 1];
                const nextStart = getWeekStartDate(last.year, last.week);
                nextStart.setDate(nextStart.getDate() + 7);
                const nextInfo = getISOWeekInfo(nextStart);
                ensureWeek(data, nextInfo.year, nextInfo.week);
                saveWorkData(dataKey, data);
                WorkState.activeWeek[dataKey] = makeWeekKey(nextInfo.year, nextInfo.week);
                rerenderWorkCategory(dataKey);
            }
        }

        function workUpdateEntry(dataKey, dayKey, index, field, value, rerender) {
            const data = getWorkData(dataKey);
            const currentKey = WorkState.activeWeek[dataKey];
            const target = currentKey ? parseWeekKey(currentKey) : null;
            if (!target) return;
            ensureWeek(data, target.year, target.week);
            const week = data.weeks.find(w => w.year === target.year && w.week === target.week);
            if (!week.days) week.days = {};
            const entries = normalizeDayEntries(week.days[dayKey] || []);
            while (entries.length <= index) {
                entries.push({ team: '', room: '', task: '' });
            }
            const entry = entries[index];
            entry[field] = value;
            if (field === 'team') {
                const rooms = value ? getEquipRooms(value) : [];
                if (!rooms.length || !rooms.includes(entry.room)) {
                    entry.room = '';
                }
            }
            week.days[dayKey] = entries;
            saveWorkData(dataKey, data);
            const category = getWorkCategory(dataKey);
            setLastModified(category?.title || '팀별내역서');
            if (rerender) {
                rerenderWorkCategory(dataKey);
            }
        }

        function workAddEntry(dataKey, dayKey) {
            const data = getWorkData(dataKey);
            const currentKey = WorkState.activeWeek[dataKey];
            const target = currentKey ? parseWeekKey(currentKey) : null;
            if (!target) return;
            ensureWeek(data, target.year, target.week);
            const week = data.weeks.find(w => w.year === target.year && w.week === target.week);
            if (!week.days) week.days = {};
            const entries = normalizeDayEntries(week.days[dayKey] || []);
            entries.push({ team: '', room: '', task: '' });
            week.days[dayKey] = entries;
            saveWorkData(dataKey, data);
            const category = getWorkCategory(dataKey);
            setLastModified(category?.title || '팀별내역서');
            rerenderWorkCategory(dataKey);
        }

        function workRemoveEntry(dataKey, dayKey, index) {
            const data = getWorkData(dataKey);
            const currentKey = WorkState.activeWeek[dataKey];
            const target = currentKey ? parseWeekKey(currentKey) : null;
            if (!target) return;
            ensureWeek(data, target.year, target.week);
            const week = data.weeks.find(w => w.year === target.year && w.week === target.week);
            if (!week.days) week.days = {};
            const entries = normalizeDayEntries(week.days[dayKey] || []);
            const targetIndex = Number(index);
            if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= entries.length) return;
            if (entries.length <= 1) return;
            entries.splice(targetIndex, 1);
            if (!entries.length) entries.push({ team: '', room: '', task: '' });
            week.days[dayKey] = entries;
            saveWorkData(dataKey, data);
            const category = getWorkCategory(dataKey);
            setLastModified(category?.title || '팀별내역서');
            rerenderWorkCategory(dataKey);
        }

        function closeAllTeamDropdowns() {
            document.querySelectorAll('.work-team-select-wrap.open').forEach(el => el.classList.remove('open'));
        }

        function toggleTeamDropdown(id, evt) {
            if (evt) evt.stopPropagation();
            const el = document.getElementById(id);
            if (!el) return;
            const isOpen = el.classList.contains('open');
            closeAllTeamDropdowns();
            if (!isOpen) el.classList.add('open');
        }

        function selectTeamOption(dataKey, dayKey, index, team, evt) {
            if (evt) evt.stopPropagation();
            workUpdateEntry(dataKey, dayKey, index, 'team', team, true);
            closeAllTeamDropdowns();
        }
