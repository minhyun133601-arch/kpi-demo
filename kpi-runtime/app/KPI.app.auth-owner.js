        function getRuntimeAuthElements() {
            return {
                dashboardBar: document.getElementById('dashboard-auth-bar'),
                dashboardIdentity: document.getElementById('dashboard-auth-identity'),
                dashboardRole: document.getElementById('dashboard-auth-role'),
                dashboardLogout: document.getElementById('dashboard-auth-logout'),
                viewerBar: document.getElementById('viewer-auth-bar'),
                viewerIdentity: document.getElementById('viewer-auth-identity'),
                viewerRole: document.getElementById('viewer-auth-role'),
                viewerLogout: document.getElementById('viewer-auth-logout')
            };
        }

        function getRuntimeAuthIdentityLabel(user = null) {
            const currentUser = user || getRuntimeCurrentUser();
            if (!currentUser) return '';
            const username = normalizeOwnerRecordsText(currentUser.username, '');
            const displayName = normalizeOwnerRecordsText(
                currentUser.displayName || currentUser.display_name,
                ''
            );
            if (displayName && username && displayName !== username) {
                return `${displayName} (${username})`;
            }
            return displayName || username;
        }

        function getRuntimeAuthRoleLabel(user = null) {
            const currentUser = user || getRuntimeCurrentUser();
            if (!currentUser) return '';
            if (hasOwnerRole(currentUser)) {
                return 'owner';
            }
            const roles = Array.isArray(currentUser.roles)
                ? currentUser.roles.map(role => String(role || '').trim()).filter(Boolean)
                : [];
            if (!roles.length) {
                return 'user';
            }
            return roles.join(', ');
        }

        function renderRuntimeAuthUi() {
            const elements = getRuntimeAuthElements();
            const currentUser = getRuntimeCurrentUser();
            const identityLabel = getRuntimeAuthIdentityLabel(currentUser);
            const roleLabel = getRuntimeAuthRoleLabel(currentUser);
            const isVisible = Boolean(currentUser && identityLabel);
            const logoutLabel = RuntimeAuthState.busy ? 'Signing out...' : 'Logout';

            [
                [elements.dashboardBar, elements.dashboardIdentity, elements.dashboardRole, elements.dashboardLogout],
                [elements.viewerBar, elements.viewerIdentity, elements.viewerRole, elements.viewerLogout]
            ].forEach(([bar, identity, role, logoutButton]) => {
                if (bar) {
                    bar.hidden = !isVisible;
                }
                if (identity) {
                    identity.textContent = identityLabel || '-';
                }
                if (role) {
                    role.textContent = roleLabel || '';
                }
                if (logoutButton) {
                    const logoutLabelElement = logoutButton.querySelector('.runtime-auth-logout-label');
                    logoutButton.disabled = RuntimeAuthState.busy;
                    if (logoutLabelElement) {
                        logoutLabelElement.textContent = logoutLabel;
                    } else {
                        logoutButton.textContent = logoutLabel;
                    }
                    logoutButton.title = logoutLabel;
                    logoutButton.setAttribute('aria-label', logoutLabel);
                }
            });
        }

        async function logoutCurrentUser() {
            if (RuntimeAuthState.busy) return;
            RuntimeAuthState.busy = true;
            renderRuntimeAuthUi();

            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'same-origin'
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok || payload?.ok !== true) {
                    throw new Error(payload?.error || 'logout_failed');
                }
                window.location.replace('/login');
            } catch (error) {
                console.error('Logout failed.', error);
                RuntimeAuthState.busy = false;
                renderRuntimeAuthUi();
                if (typeof window.alert === 'function') {
                    window.alert('Logout failed. Please try again.');
                }
            }
        }

        function bindRuntimeAuthUi() {
            if (window.__runtimeAuthUiBound) return;
            window.__runtimeAuthUiBound = true;
            const { dashboardLogout, viewerLogout } = getRuntimeAuthElements();
            [dashboardLogout, viewerLogout].forEach(button => {
                button?.addEventListener('click', () => {
                    void logoutCurrentUser();
                });
            });
        }

        const OWNER_RECORDS_DATA_KEY = 'owner_accounts';
        const OWNER_RECORDS_FULLSCREEN_SHORTCUT = 'Alt+Enter';
        const OWNER_RECORDS_TAB_LABELS = Object.freeze({
            [OWNER_RECORDS_TAB_KEYS.LOGIN]: '로그인 기록',
            [OWNER_RECORDS_TAB_KEYS.USERS]: '등록 계정'
        });

        function getOwnerRecordsMountRoot() {
            return OwnerRecordsState.mountRoot instanceof Element
                ? OwnerRecordsState.mountRoot
                : null;
        }

        function getOwnerRecordsElements() {
            const root = getOwnerRecordsMountRoot();
            return {
                root,
                loginTab: root?.querySelector('[data-owner-records-tab="login"]') || null,
                usersTab: root?.querySelector('[data-owner-records-tab="users"]') || null,
                fullscreenButton: root?.querySelector('[data-owner-records-action="fullscreen"]') || null
            };
        }

        function normalizeOwnerRecordsText(value, fallback = '-') {
            const normalized = String(value || '').trim();
            return normalized || fallback;
        }

        function renderOwnerRoleChips(roles = []) {
            const items = Array.isArray(roles)
                ? roles.map(role => String(role || '').trim()).filter(Boolean)
                : [];
            if (!items.length) {
                return '<span class="owner-records-chip is-neutral">-</span>';
            }
            return `<div class="owner-records-inline-list">${items.map(role => `<span class="owner-records-chip is-neutral">${escapeDashboardHtml(role)}</span>`).join('')}</div>`;
        }

        function renderOwnerStatusChip(label, tone = 'neutral') {
            const toneClass = tone === 'positive' ? ' is-positive' : ' is-neutral';
            return `<span class="owner-records-chip${toneClass}">${escapeDashboardHtml(label)}</span>`;
        }

        function renderOwnerSessionDot(isActive) {
            const statusLabel = isActive
                ? '\uC811\uC18D\uC911'
                : '\uBBF8\uC811\uC18D';
            const toneClass = isActive ? ' is-active' : ' is-inactive';
            return `<span class="owner-records-session-dot${toneClass}" title="${statusLabel}" aria-label="${statusLabel}"></span>`;
        }

        function renderOwnerRecentChanges(entries = []) {
            if (!Array.isArray(entries) || !entries.length) {
                return '<div class="owner-records-primary"><span class="owner-records-sub">\uAE30\uB85D \uC5C6\uC74C</span></div>';
            }
            return entries.map(entry => {
                const changedAt = escapeDashboardHtml(formatDashboardDateTime(entry?.changedAt));
                const changeType = escapeDashboardHtml(normalizeOwnerRecordsText(entry?.changeType));
                const itemLabel = escapeDashboardHtml(normalizeOwnerRecordsText(entry?.itemLabel));
                return `
                    <div class="owner-records-primary owner-records-activity-item">
                        <strong>${changedAt} ${changeType}</strong>
                        <span class="owner-records-sub">${itemLabel}</span>
                    </div>
                `;
            }).join('');
        }

        function buildOwnerDisplayNameLine(usernameValue, displayNameValue) {
            const username = normalizeOwnerRecordsText(usernameValue, '');
            const displayName = normalizeOwnerRecordsText(displayNameValue, '');
            if (!displayName || displayName === username) {
                return '';
            }
            return `<span class="owner-records-sub">${escapeDashboardHtml(displayName)}</span>`;
        }

        function buildOwnerLoginHistoryHtml(entries = []) {
            if (!Array.isArray(entries) || !entries.length) {
                return '<div class="owner-records-empty">\uC544\uC9C1 \uAE30\uB85D\uB41C \uB85C\uADF8\uC778 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
            }
            const rows = entries.map(entry => {
                const username = escapeDashboardHtml(normalizeOwnerRecordsText(entry?.username));
                const displayNameLine = buildOwnerDisplayNameLine(entry?.username, entry?.displayName);
                const ipAddress = escapeDashboardHtml(normalizeOwnerRecordsText(entry?.ipAddress));
                const userAgent = escapeDashboardHtml(normalizeOwnerRecordsText(entry?.userAgent, '\uBE0C\uB77C\uC6B0\uC800 \uC815\uBCF4 \uC5C6\uC74C'));
                const lastSeenAt = formatDashboardDateTime(entry?.lastSeenAt);
                const expiresAt = formatDashboardDateTime(entry?.expiresAt);
                const sessionChip = entry?.sessionActive
                    ? renderOwnerStatusChip('\uC811\uC18D\uC911', 'positive')
                    : renderOwnerStatusChip('\uC885\uB8CC');
                const userChip = entry?.isActive
                    ? renderOwnerStatusChip('\uACC4\uC815 \uD65C\uC131', 'positive')
                    : renderOwnerStatusChip('\uACC4\uC815 \uBE44\uD65C\uC131');
                return `
                    <tr>
                        <td>
                            <div class="owner-records-primary">
                                <strong>${username}</strong>
                                ${displayNameLine}
                            </div>
                        </td>
                        <td>${formatDashboardDateTime(entry?.loggedInAt)}</td>
                        <td>${renderOwnerRoleChips(entry?.roles)}</td>
                        <td>
                            <div class="owner-records-primary">
                                <strong>${ipAddress}</strong>
                                <span class="owner-records-sub">${userAgent}</span>
                            </div>
                        </td>
                        <td>
                            <div class="owner-records-inline-list">
                                ${sessionChip}
                                ${userChip}
                            </div>
                            <div class="owner-records-sub">\uB9C8\uC9C0\uB9C9 \uD65C\uB3D9 ${escapeDashboardHtml(lastSeenAt)} / \uB9CC\uB8CC ${escapeDashboardHtml(expiresAt)}</div>
                        </td>
                    </tr>
                `;
            }).join('');
            return `
                <table class="owner-records-table">
                    <thead>
                        <tr>
                            <th>\uC544\uC774\uB514</th>
                            <th>\uB85C\uADF8\uC778 \uC2DC\uAC04</th>
                            <th>\uC5ED\uD560</th>
                            <th>\uC811\uC18D \uC815\uBCF4</th>
                            <th>\uC0C1\uD0DC</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }

        function buildOwnerUsersHtml(entries = []) {
            if (!Array.isArray(entries) || !entries.length) {
                return '<div class="owner-records-empty">\uB4F1\uB85D\uB41C \uACC4\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
            }
            const rows = entries.map(entry => {
                const username = escapeDashboardHtml(normalizeOwnerRecordsText(entry?.username));
                const displayNameLine = buildOwnerDisplayNameLine(entry?.username, entry?.displayName);
                const lastAccessAt = escapeDashboardHtml(formatDashboardDateTime(entry?.lastAccessAt));
                const statusChip = entry?.isActive
                    ? renderOwnerStatusChip('\uD65C\uC131', 'positive')
                    : renderOwnerStatusChip('\uBE44\uD65C\uC131');
                return `
                    <tr>
                        <td>
                            <div class="owner-records-primary">
                                <span class="owner-records-account-line">
                                    <strong>${username}</strong>
                                    ${renderOwnerSessionDot(entry?.sessionActive)}
                                </span>
                                ${displayNameLine}
                                <span class="owner-records-sub">\uCD5C\uC885 \uC811\uC18D ${lastAccessAt}</span>
                            </div>
                        </td>
                        <td>${renderOwnerRoleChips(entry?.roles)}</td>
                        <td>${statusChip}</td>
                        <td>${renderOwnerRecentChanges(entry?.recentChanges)}</td>
                    </tr>
                `;
            }).join('');
            return `
                <table class="owner-records-table">
                    <thead>
                        <tr>
                            <th>\uC544\uC774\uB514</th>
                            <th>\uC5ED\uD560</th>
                            <th>\uC0C1\uD0DC</th>
                            <th>\uC0DD\uC131/\uC218\uC815</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }

        function getOwnerRecordsActiveSessionCount() {
            return OwnerRecordsState.users.filter(entry => entry?.sessionActive === true).length;
        }

        function getOwnerRecordsActiveUserCount() {
            return OwnerRecordsState.users.filter(entry => entry?.isActive === true).length;
        }

        function getOwnerRecordsLatestLoginLabel() {
            const latestLogin = OwnerRecordsState.loginHistory[0];
            return formatDashboardDateTime(latestLogin?.loggedInAt || latestLogin?.lastSeenAt);
        }

        function isOwnerRecordsBrowserFullscreen() {
            const root = getOwnerRecordsMountRoot();
            return Boolean(root && document.fullscreenElement === root);
        }

        async function toggleOwnerRecordsBrowserFullscreen() {
            const root = getOwnerRecordsMountRoot();
            if (!root) return;
            try {
                if (document.fullscreenElement === root) {
                    await document.exitFullscreen?.();
                    return;
                }
                await root.requestFullscreen?.();
            } catch (error) {
                console.error('Owner records fullscreen toggle failed.', error);
            }
        }

        function buildOwnerRecordsSummaryHtml() {
            const cards = [
                {
                    label: '등록 계정',
                    value: String(OwnerRecordsState.users.length),
                    copy: `${getOwnerRecordsActiveUserCount()}개 계정 활성`
                },
                {
                    label: '접속 중 세션',
                    value: String(getOwnerRecordsActiveSessionCount()),
                    copy: '브라우저 세션 기준'
                },
                {
                    label: '최근 로그인',
                    value: getOwnerRecordsLatestLoginLabel(),
                    copy: '가장 최근 활동 시각'
                }
            ];
            return cards.map(card => `
                <article class="owner-records-summary-card">
                    <div class="owner-records-summary-label">${escapeDashboardHtml(card.label)}</div>
                    <div class="owner-records-summary-value">${escapeDashboardHtml(card.value)}</div>
                    <div class="owner-records-summary-copy">${escapeDashboardHtml(card.copy)}</div>
                </article>
            `).join('');
        }

        function buildOwnerRecordsShellHtml() {
            const activeTab = OwnerRecordsState.activeTab === OWNER_RECORDS_TAB_KEYS.LOGIN
                ? OWNER_RECORDS_TAB_KEYS.LOGIN
                : OWNER_RECORDS_TAB_KEYS.USERS;
            const isFullscreen = isOwnerRecordsBrowserFullscreen();
            const feedbackMessage = OwnerRecordsState.loading
                ? '기록을 불러오는 중입니다.'
                : OwnerRecordsState.errorMessage;
            const activeBodyHtml = activeTab === OWNER_RECORDS_TAB_KEYS.LOGIN
                ? buildOwnerLoginHistoryHtml(OwnerRecordsState.loginHistory)
                : buildOwnerUsersHtml(OwnerRecordsState.users);
            const currentUserLabel = getRuntimeAuthIdentityLabel() || '-';
            const fullscreenButtonHtml = `
                <button
                    type="button"
                    class="owner-records-fullscreen-button${isFullscreen ? ' is-active' : ''}"
                    data-owner-records-action="fullscreen"
                    aria-pressed="${isFullscreen ? 'true' : 'false'}"
                    aria-label="${isFullscreen ? '전체화면 종료' : '전체화면'}"
                    title="${isFullscreen ? '전체화면 종료' : `전체화면 (${OWNER_RECORDS_FULLSCREEN_SHORTCUT})`}"
                >
                    <i class="fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}" aria-hidden="true"></i>
                </button>
            `;
            const shellHeadHtml = isFullscreen ? '' : `
                <div class="owner-records-shell-head">
                    <div class="owner-records-shell-copy-block">
                        <div class="owner-records-shell-kicker">OWNER ONLY</div>
                        <h2 class="owner-records-shell-title">계정 관리</h2>
                        <p class="owner-records-shell-copy">오너 계정 전용으로 로그인 기록과 등록 계정을 한 화면에서 확인합니다.</p>
                        <div class="owner-records-shell-meta">
                            <span class="owner-records-shell-meta-item">현재 로그인 ${escapeDashboardHtml(currentUserLabel)}</span>
                        </div>
                    </div>
                    <div class="owner-records-shell-actions">
                        ${fullscreenButtonHtml}
                    </div>
                </div>
            `;
            const summaryHtml = isFullscreen ? '' : `
                <section class="owner-records-summary-grid" aria-label="계정 관리 요약">
                    ${buildOwnerRecordsSummaryHtml()}
                </section>
            `;

            return `
                <section class="owner-records-shell${isFullscreen ? ' is-browser-fullscreen' : ''}">
                    ${shellHeadHtml}
                    ${summaryHtml}
                    <div class="owner-records-toolbar${isFullscreen ? ' is-browser-fullscreen' : ''}">
                        <div class="owner-records-tabs" role="tablist" aria-label="기록 관리 탭">
                            <button
                                type="button"
                                class="owner-records-tab${activeTab === OWNER_RECORDS_TAB_KEYS.USERS ? ' is-active' : ''}"
                                data-owner-records-tab="users"
                                role="tab"
                                aria-selected="${activeTab === OWNER_RECORDS_TAB_KEYS.USERS ? 'true' : 'false'}"
                            >
                                <span>${OWNER_RECORDS_TAB_LABELS[OWNER_RECORDS_TAB_KEYS.USERS]}</span>
                                <span class="owner-records-tab-count">${OwnerRecordsState.users.length}</span>
                            </button>
                            <button
                                type="button"
                                class="owner-records-tab${activeTab === OWNER_RECORDS_TAB_KEYS.LOGIN ? ' is-active' : ''}"
                                data-owner-records-tab="login"
                                role="tab"
                                aria-selected="${activeTab === OWNER_RECORDS_TAB_KEYS.LOGIN ? 'true' : 'false'}"
                            >
                                <span>${OWNER_RECORDS_TAB_LABELS[OWNER_RECORDS_TAB_KEYS.LOGIN]}</span>
                                <span class="owner-records-tab-count">${OwnerRecordsState.loginHistory.length}</span>
                            </button>
                        </div>
                        ${isFullscreen ? `<div class="owner-records-shell-actions">${fullscreenButtonHtml}</div>` : ''}
                    </div>
                    <div class="owner-records-feedback${OwnerRecordsState.errorMessage && !OwnerRecordsState.loading ? ' is-error' : ''}"${feedbackMessage ? '' : ' hidden'}>${escapeDashboardHtml(feedbackMessage || '')}</div>
                    <section class="owner-records-pane" aria-label="${escapeDashboardHtml(OWNER_RECORDS_TAB_LABELS[activeTab])}">
                        ${activeBodyHtml}
                    </section>
                </section>
            `;
        }

        function renderOwnerRecordsView() {
            const root = getOwnerRecordsMountRoot();
            const isOwner = hasOwnerRole();
            OwnerRecordsState.isOwner = isOwner;
            if (!root) return;
            if (!isOwner) {
                root.innerHTML = '';
                return;
            }

            root.innerHTML = buildOwnerRecordsShellHtml();
            const { loginTab, usersTab, fullscreenButton } = getOwnerRecordsElements();
            loginTab?.addEventListener('click', () => {
                setOwnerRecordsTab(OWNER_RECORDS_TAB_KEYS.LOGIN);
            });
            usersTab?.addEventListener('click', () => {
                setOwnerRecordsTab(OWNER_RECORDS_TAB_KEYS.USERS);
            });
            fullscreenButton?.addEventListener('click', () => {
                void toggleOwnerRecordsBrowserFullscreen();
            });
        }

        function mountOwnerRecordsView(root = null) {
            if (!(root instanceof Element)) {
                OwnerRecordsState.mountRoot = null;
                return;
            }
            OwnerRecordsState.mountRoot = root;
            OwnerRecordsState.isOwner = hasOwnerRole();
            renderOwnerRecordsView();
            if (OwnerRecordsState.isOwner) {
                void loadOwnerRecordsOverview({ force: true });
            }
        }

        function clearOwnerRecordsView() {
            const root = getOwnerRecordsMountRoot();
            if (
                document.fullscreenElement === root
                && typeof document.exitFullscreen === 'function'
            ) {
                try {
                    const exitResult = document.exitFullscreen();
                    if (exitResult && typeof exitResult.catch === 'function') {
                        exitResult.catch(() => {});
                    }
                } catch (error) {
                    // Ignore local preview fullscreen teardown failures.
                }
            }
            if (root) {
                root.innerHTML = '';
            }
            OwnerRecordsState.mountRoot = null;
        }

        async function loadOwnerRecordsOverview(options = {}) {
            if (!OwnerRecordsState.isOwner) return;
            if (OwnerRecordsState.loading) return;
            const shouldForce = options.force === true;
            if (OwnerRecordsState.loaded && !shouldForce) {
                renderOwnerRecordsView();
                return;
            }

            OwnerRecordsState.loading = true;
            OwnerRecordsState.errorMessage = '';
            renderOwnerRecordsView();

            try {
                const response = await fetch('/api/owner/access-overview?limit=100', {
                    credentials: 'same-origin'
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok || payload?.ok !== true) {
                    throw new Error(payload?.error || 'owner_records_load_failed');
                }
                OwnerRecordsState.loginHistory = Array.isArray(payload.loginHistory) ? payload.loginHistory : [];
                OwnerRecordsState.users = Array.isArray(payload.users) ? payload.users : [];
                OwnerRecordsState.loaded = true;
            } catch (error) {
                console.error('Owner records load failed.', error);
                OwnerRecordsState.errorMessage = '\uAE30\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.';
            } finally {
                OwnerRecordsState.loading = false;
                renderOwnerRecordsView();
            }
        }

        function setOwnerRecordsTab(tabKey) {
            OwnerRecordsState.activeTab = tabKey === OWNER_RECORDS_TAB_KEYS.USERS
                ? OWNER_RECORDS_TAB_KEYS.USERS
                : OWNER_RECORDS_TAB_KEYS.LOGIN;
            renderOwnerRecordsView();
        }

        function bindOwnerRecordsUi() {
            if (window.__ownerRecordsUiBound) return;
            window.__ownerRecordsUiBound = true;
            KpiRuntime?.registerSectionInitializer?.('owner', (context = {}) => {
                const dataKey = String(context.category?.dataKey || '').trim();
                if (dataKey !== OWNER_RECORDS_DATA_KEY) {
                    clearOwnerRecordsView();
                    return;
                }
                const root = context.container?.querySelector?.('[data-owner-records-root]') || null;
                mountOwnerRecordsView(root);
            });
            KpiRuntime?.registerViewChangeHandler?.('owner-records-view', (context = {}) => {
                const dataKey = String(context.category?.dataKey || '').trim();
                if (context.sectionId === 'owner' && dataKey === OWNER_RECORDS_DATA_KEY) return;
                clearOwnerRecordsView();
            });
            document.addEventListener('keydown', evt => {
                if (!getOwnerRecordsMountRoot()) return;
                if (evt.altKey && evt.key === 'Enter') {
                    evt.preventDefault();
                    void toggleOwnerRecordsBrowserFullscreen();
                    return;
                }
                if (evt.key === 'Escape' && isOwnerRecordsBrowserFullscreen()) {
                    evt.preventDefault();
                    void document.exitFullscreen?.();
                }
            });
            document.addEventListener('fullscreenchange', () => {
                renderOwnerRecordsView();
            });
        }
