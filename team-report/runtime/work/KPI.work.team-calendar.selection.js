        function openWorkTeamCalendarEditor(dateKey, options = {}) {
            const dataKey = options.dataKey || WorkState.teamCalendarModal;
            const normalizedDateKey = String(dateKey || '').trim();
            if (!dataKey || !normalizedDateKey || isWorkTeamCalendarDateLocked(normalizedDateKey)) return false;
            WorkState.teamCalendarDate[dataKey] = normalizedDateKey;
            if (Array.isArray(options.members)) {
                applyWorkTeamCalendarMembers(dataKey, normalizedDateKey, options.members, {
                    markModified: options.markModified !== false,
                    render: false
                });
            }
            const state = getWorkTeamCalendarEditorState(dataKey);
            const dateChanged = state.dateKey !== normalizedDateKey;
            state.open = true;
            state.dateKey = normalizedDateKey;
            state.manual = options.manual === true;
            if (options.resetPosition === true || dateChanged) {
                resetWorkTeamCalendarEditorPosition(dataKey);
            }
            if (options.render !== false) {
                renderWorkTeamCalendarModal();
            }
            return true;
        }

        function closeWorkTeamCalendarEditor(dataKey = WorkState.teamCalendarModal, options = {}) {
            if (!dataKey) return;
            const state = getWorkTeamCalendarEditorState(dataKey);
            state.open = false;
            state.dateKey = '';
            state.manual = false;
            if (options.render !== false) {
                renderWorkTeamCalendarModal();
            }
        }

        function completeWorkTeamCalendarEditor() {
            closeWorkTeamCalendarEditor();
        }

        function clearWorkTeamCalendarSelection(dataKey = WorkState.teamCalendarModal, options = {}) {
            if (!dataKey) return false;
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const selectedDateKeys = getWorkTeamCalendarSelectedDateKeys(dataKey, monthKey);
            const hadSelection = selectedDateKeys.length > 0 || hasWorkTeamCalendarExplicitDateSelection(dataKey);
            const state = getWorkTeamCalendarEditorState(dataKey);
            state.open = false;
            state.dateKey = '';
            state.manual = false;
            WorkState.teamCalendarDate[dataKey] = '';
            setWorkTeamCalendarSelectedDateKeys(dataKey, [], monthKey);
            setWorkTeamCalendarExplicitDateSelection(dataKey, false);
            if (options.render !== false) {
                renderWorkTeamCalendarModal();
            }
            return hadSelection;
        }

        function openWorkTeamCalendarModal(dataKey, options = {}) {
            const inline = options.inline === true || (options.inline !== false && isWorkTeamCalendarInlineMode());
            WorkState.teamCalendarModal = dataKey;
            WorkState.teamCalendarHubDataKey = dataKey;
            WorkState.teamCalendarUtilityPopup[dataKey] = '';
            const modal = mountWorkTeamCalendarSurface({ inline });
            const state = getWorkTeamCalendarEditorState(dataKey);
            state.open = false;
            state.dateKey = '';
            state.manual = false;
            setWorkTeamCalendarSelectedDateKeys(dataKey, [], getWorkTeamCalendarActiveMonth(dataKey));
            setWorkTeamCalendarExplicitDateSelection(dataKey, false);
            modal.classList.add('is-open');
            document.body.style.overflow = inline ? '' : 'hidden';
            renderWorkTeamCalendarModal();
        }

        async function closeWorkTeamCalendarModal() {
            await exitWorkTeamCalendarFullscreen();
            const currentKey = WorkState.teamCalendarModal;
            if (currentKey) {
                const state = getWorkTeamCalendarEditorState(currentKey);
                state.open = false;
                state.dateKey = '';
                state.manual = false;
                setWorkTeamCalendarSelectedDateKeys(currentKey, [], getWorkTeamCalendarActiveMonth(currentKey));
                setWorkTeamCalendarExplicitDateSelection(currentKey, false);
                WorkState.teamCalendarUtilityPopup[currentKey] = '';
            }
            const modal = document.getElementById('work-team-calendar-modal');
            if (modal) {
                modal.classList.remove('is-open');
                modal.classList.remove('is-inline');
                if (modal.parentElement && modal.parentElement !== document.body) {
                    modal.remove();
                }
            }
            WorkState.teamCalendarModal = '';
            WorkState.teamCalendarInline = false;
            document.body.style.overflow = '';
            syncWorkTeamCalendarInlineIndex('');
        }

        function switchWorkTeamCalendarTeam(targetDataKey) {
            const currentKey = WorkState.teamCalendarModal;
            const currentMonth = currentKey ? getWorkTeamCalendarActiveMonth(currentKey) : getWorkTeamCalendarDefaultMonth();
            const currentDate = currentKey ? getWorkTeamCalendarSelectedDate(currentKey, currentMonth) : `${currentMonth}-01`;
            const inline = isWorkTeamCalendarInlineMode();
            setWorkTeamCalendarActiveMonthState(targetDataKey, currentMonth);
            setWorkTeamCalendarFocusedDateState(targetDataKey, currentDate);
            WorkState.teamCalendarHubDataKey = targetDataKey;
            setWorkTeamCalendarSelectedDateKeys(targetDataKey, [], currentMonth);
            const nextEditorState = getWorkTeamCalendarEditorState(targetDataKey);
            nextEditorState.open = false;
            nextEditorState.dateKey = '';
            nextEditorState.manual = false;
            setWorkTeamCalendarExplicitDateSelection(targetDataKey, false);
            openWorkTeamCalendarModal(targetDataKey, { inline });
            if (typeof renderSidebar === 'function') {
                renderSidebar();
            }
        }

        function switchWorkTeamCalendarTeamByNumber(numberKey) {
            const index = Number(numberKey) - 1;
            if (!Number.isFinite(index) || index < 0) return false;
            if (activeSectionId !== 'work') return false;
            const target = getWorkTeamCalendarCategories()[index] || null;
            if (!target?.dataKey) return false;
            switchWorkTeamCalendarTeam(target.dataKey);
            return true;
        }

        function toggleWorkTeamCalendarWorkInput() {
            return false;
        }

        function bindWorkTeamCalendarMemberPicker(modal, dataKey, dateKey) {
            const grid = modal?.querySelector?.('[data-work-team-member-grid]');
            if (!grid) return;
            const getButton = target => target?.closest?.('[data-work-team-member-name]');
            const getMemberName = target => String(getButton(target)?.getAttribute('data-work-team-member-name') || '').trim();
            grid.addEventListener('click', event => {
                const memberName = getMemberName(event.target);
                if (!memberName) return;
                event.preventDefault();
                if (event.ctrlKey || event.metaKey) {
                    toggleWorkTeamCalendarMember(memberName, { dataKey, dateKey, render: true });
                    return;
                }
                selectWorkTeamCalendarSingle(memberName, { dataKey, dateKey, render: true });
            });
        }

        function bindWorkTeamCalendarEditorOverlay(modal, dataKey) {
            const editor = modal?.querySelector?.('[data-work-team-editor]');
            const handle = modal?.querySelector?.('[data-work-team-editor-handle]');
            const board = modal?.querySelector?.('[data-work-team-board]');
            if (!editor || !handle || !board || !editor.classList.contains('is-floating')) return;
            const clampPosition = (left, top) => {
                const margin = 12;
                const boardRect = board.getBoundingClientRect();
                const editorRect = editor.getBoundingClientRect();
                const maxLeft = Math.max(margin, boardRect.width - editorRect.width - margin);
                const maxTop = Math.max(margin, boardRect.height - editorRect.height - margin);
                return {
                    left: Math.min(Math.max(margin, left), maxLeft),
                    top: Math.min(Math.max(margin, top), maxTop)
                };
            };
            const syncPosition = () => {
                const state = getWorkTeamCalendarEditorState(dataKey);
                const next = clampPosition(state.x, state.y);
                editor.style.left = `${next.left}px`;
                editor.style.top = `${next.top}px`;
                state.x = next.left;
                state.y = next.top;
            };
            let drag = null;
            const finishDrag = () => {
                if (!drag) return;
                editor.classList.remove('is-dragging');
                if (drag.pointerId != null) {
                    try { handle.releasePointerCapture(drag.pointerId); } catch (error) {}
                }
                drag = null;
            };
            syncPosition();
            handle.addEventListener('pointerdown', event => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                const editorRect = editor.getBoundingClientRect();
                drag = {
                    pointerId: event.pointerId,
                    offsetX: event.clientX - editorRect.left,
                    offsetY: event.clientY - editorRect.top
                };
                editor.classList.add('is-dragging');
                try { handle.setPointerCapture(event.pointerId); } catch (error) {}
                event.preventDefault();
            });
            handle.addEventListener('pointermove', event => {
                if (!drag || drag.pointerId !== event.pointerId) return;
                const boardRect = board.getBoundingClientRect();
                const next = clampPosition(
                    event.clientX - boardRect.left - drag.offsetX,
                    event.clientY - boardRect.top - drag.offsetY
                );
                editor.style.left = `${next.left}px`;
                editor.style.top = `${next.top}px`;
                const state = getWorkTeamCalendarEditorState(dataKey);
                state.x = next.left;
                state.y = next.top;
                event.preventDefault();
            });
            handle.addEventListener('pointerup', finishDrag);
            handle.addEventListener('pointercancel', finishDrag);
            handle.addEventListener('lostpointercapture', finishDrag);
        }

        function resetWorkTeamCalendarMonthSelection(dataKey, nextMonth, options = {}) {
            setWorkTeamCalendarActiveMonthState(dataKey, nextMonth);
            setWorkTeamCalendarFocusedDateState(dataKey, '');
            setWorkTeamCalendarSelectedDateKeys(dataKey, [], nextMonth);
            setWorkTeamCalendarExplicitDateSelection(dataKey, false);
            if (options.closeEditor !== false) {
                closeWorkTeamCalendarEditor(dataKey, { render: false });
            }
        }

        function workTeamCalendarMoveMonth(step) {
            const dataKey = WorkState.teamCalendarModal;
            const current = getWorkTeamCalendarActiveMonth(dataKey);
            const parsed = parseMonthKey(current);
            if (!parsed) return;
            const nextDate = new Date(parsed.year, parsed.monthIndex + Number(step || 0), 1);
            const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
            const clamped = clampWorkTeamCalendarMonthKey(nextKey);
            if (clamped === current) return;
            resetWorkTeamCalendarMonthSelection(dataKey, clamped);
            renderWorkTeamCalendarModal();
        }

        function workTeamCalendarNavigateArrow(step) {
            const dataKey = WorkState.teamCalendarModal;
            if (!dataKey) return;
            if (Math.abs(step) === 1) {
                workTeamCalendarMoveMonth(step);
                return;
            }
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const selectedDateKeys = getWorkTeamCalendarSelectedDateKeys(dataKey, monthKey);
            const selectedDate = getWorkTeamCalendarPrimarySelectedDate(dataKey, monthKey);
            if (!hasWorkTeamCalendarExplicitDateSelection(dataKey) || selectedDateKeys.length !== 1) {
                return;
            }
            const nextDateKey = getWorkTeamCalendarNavigationTarget(selectedDate, step);
            if (!nextDateKey) return;
            setWorkTeamCalendarActiveMonthState(dataKey, nextDateKey.slice(0, 7));
            setWorkTeamCalendarFocusedDateState(dataKey, nextDateKey);
            setWorkTeamCalendarSelectedDateKeys(dataKey, [nextDateKey], nextDateKey.slice(0, 7));
            const state = getWorkTeamCalendarEditorState(dataKey);
            if (state.open) {
                state.dateKey = nextDateKey;
            }
            setWorkTeamCalendarExplicitDateSelection(dataKey, true);
            renderWorkTeamCalendarModal();
        }

        function workTeamCalendarSelectYear(year) {
            const dataKey = WorkState.teamCalendarModal;
            if (!dataKey) return;
            const currentMonth = getWorkTeamCalendarActiveMonth(dataKey);
            const currentMonthLabel = currentMonth.slice(5);
            const options = getWorkTeamCalendarMonthOptionsForYear(year);
            if (!options.length) return;
            const nextMonth = options.find(optionKey => optionKey.endsWith(currentMonthLabel)) || options[0];
            resetWorkTeamCalendarMonthSelection(dataKey, nextMonth);
            renderWorkTeamCalendarModal();
        }

        function workTeamCalendarSelectMonth(monthKey) {
            const dataKey = WorkState.teamCalendarModal;
            if (!dataKey) return;
            const nextMonth = clampWorkTeamCalendarMonthKey(monthKey);
            resetWorkTeamCalendarMonthSelection(dataKey, nextMonth);
            renderWorkTeamCalendarModal();
        }

        function workTeamCalendarSelectDate(dateKey, event = null) {
            const dataKey = WorkState.teamCalendarModal;
            if (!dataKey) return;
            if (isWorkTeamCalendarDateLocked(dateKey)) return;
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const currentDates = getWorkTeamCalendarSelectedDateKeys(dataKey, monthKey);
            const withModifier = !!(event?.ctrlKey || event?.metaKey);
            let nextDates = [];
            if (withModifier) {
                nextDates = currentDates.includes(dateKey)
                    ? currentDates.filter(key => key !== dateKey)
                    : [...currentDates, dateKey];
            } else {
                nextDates = currentDates.length === 1 && currentDates[0] === dateKey ? [] : [dateKey];
            }
            setWorkTeamCalendarFocusedDateState(dataKey, dateKey);
            const normalizedDates = setWorkTeamCalendarSelectedDateKeys(dataKey, nextDates, monthKey);
            setWorkTeamCalendarExplicitDateSelection(dataKey, normalizedDates.length === 1);
            closeWorkTeamCalendarUtilityPopup(dataKey, { render: false });
            const state = getWorkTeamCalendarEditorState(dataKey);
            state.open = false;
            state.dateKey = '';
            state.manual = false;
            renderWorkTeamCalendarModal();
        }
