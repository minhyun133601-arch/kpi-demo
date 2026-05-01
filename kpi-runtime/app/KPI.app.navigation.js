        function ensureSidebarTreeState(sections = null) {
            const entries = Array.isArray(sections) ? sections : getDashboardSections();
            entries.forEach((entry, index) => {
                if (typeof SidebarTreeState.expandedSections[entry.id] !== 'boolean') {
                    SidebarTreeState.expandedSections[entry.id] = index === 0;
                }
            });
            return entries;
        }

        function updateViewerTitle(sectionId = '', category = null) {
            const titleEl = document.getElementById('section-title');
            const dividerEl = document.getElementById('viewer-header-section-divider');
            if (!titleEl) return;
            if (!sectionId || !AppData[sectionId]) {
                titleEl.innerHTML = '';
                titleEl.classList.add('is-hidden');
                dividerEl?.classList.add('is-hidden');
                return;
            }
            titleEl.classList.remove('is-hidden');
            dividerEl?.classList.remove('is-hidden');
            const section = AppData[sectionId];
            const moduleColor = section.accent || '#2563eb';
            const sectionName = escapeDashboardHtml(section.name || sectionId);
            const categoryTitle = category?.title ? ` <span class="text-slate-300">/</span> <span>${escapeDashboardHtml(category.title)}</span>` : '';
            titleEl.innerHTML = `<i class="fas ${escapeDashboardHtml(section.icon || 'fa-folder-open')}" style="color:${moduleColor};"></i> ${sectionName}${categoryTitle}`;
        }

        function renderViewerHome() {
            const contentContainer = document.getElementById('content-container');
            const mainScroll = document.getElementById('main-scroll');
            if (!contentContainer || !mainScroll) return;
            const companyLogoSrc = encodeURI(COMPANY_LOGO_SRC);
            setViewerContentMode('full-bleed');
            contentContainer.innerHTML = `
                <div class="viewer-home-shell" style="--viewer-home-logo:url('${companyLogoSrc}');">
                    <div class="viewer-home-hero">
                        <div class="viewer-home-brand-panel">
                            <div class="viewer-home-brand-frame">
                                <img class="viewer-home-brand-logo" src="${companyLogoSrc}" alt="\uD68C\uC0AC \uB85C\uACE0" />
                            </div>
                        </div>
                    </div>
                    <section class="viewer-home-guideline-section" aria-label="KPI Demo \uBCF4\uC548 \uC6B4\uC601 \uC6D0\uCE59">
                        <div class="viewer-home-guideline-header">
                            <h2 class="viewer-home-guideline-title">KPI-DEMO \uC6B4\uC601 \uC6D0\uCE59</h2>
                        </div>
                        <div class="viewer-home-guideline-grid">
                            <article class="viewer-home-guideline-card viewer-home-guideline-card-trust">
                                <div class="viewer-home-guideline-icon"><i class="fas fa-shield-halved"></i></div>
                                <div class="viewer-home-guideline-copy">
                                    <div class="viewer-home-guideline-name">\uAC1C\uC778\uC815\uBCF4 \uBCF4\uD638</div>
                                    <div class="viewer-home-guideline-quote">\uC2E4\uC81C \uC870\uC9C1, \uC0AC\uB78C, \uD604\uC7A5, \uC124\uBE44 \uC815\uBCF4\uB294 \uB370\uBAA8\uC5D0 \uC800\uC7A5\uD558\uC9C0 \uC54A\uB294\uB2E4.</div>
                                </div>
                            </article>
                            <article class="viewer-home-guideline-card viewer-home-guideline-card-communication">
                                <div class="viewer-home-guideline-icon"><i class="fas fa-database"></i></div>
                                <div class="viewer-home-guideline-copy">
                                    <div class="viewer-home-guideline-name">\uB370\uC774\uD130 \uAE30\uC900</div>
                                    <div class="viewer-home-guideline-quote">\uACF5\uAC1C \uD654\uBA74\uACFC fixture\uC5D0\uB294 \uD569\uC131 \uB370\uC774\uD130\uB9CC \uC0AC\uC6A9\uD55C\uB2E4.</div>
                                </div>
                            </article>
                            <article class="viewer-home-guideline-card viewer-home-guideline-card-value">
                                <div class="viewer-home-guideline-icon"><i class="fas fa-lock"></i></div>
                                <div class="viewer-home-guideline-copy">
                                    <div class="viewer-home-guideline-name">\uC811\uADFC \uAD00\uB9AC</div>
                                    <div class="viewer-home-guideline-quote">\uC11C\uBC84, DB, \uD30C\uC77C \uC800\uC7A5\uC18C \uC811\uADFC\uC740 \uB85C\uCEEC \uAD8C\uD55C\uACFC \uB85C\uADF8\uB85C \uD655\uC778\uD55C\uB2E4.</div>
                                </div>
                            </article>
                        </div>
                    </section>
                </div>
            `;
            mainScroll.scrollTop = 0;
        }

        function collapseSidebarSections() {
            const sections = getDashboardSections();
            sections.forEach(sectionEntry => {
                SidebarTreeState.expandedSections[sectionEntry.id] = false;
            });
        }

        function toggleSidebarSection(sectionId = '') {
            const key = getDashboardSectionKey(sectionId);
            if (!key) return;
            SidebarTreeState.expandedSections[key] = SidebarTreeState.expandedSections[key] !== true;
            renderSidebar();
        }

        function buildDashboardSectionPanelHtml(entry) {
            if (!entry) {
                return `
                    <div class="dashboard-panel">
                        <div class="dashboard-panel-surface">
                            <div class="dashboard-empty-state">\uD45C\uC2DC\uD560 \uBAA8\uB4C8\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>
                        </div>
                    </div>
                `;
            }

            const { id, section, categories, accent, softAccent } = entry;
            const visibleCategoryCount = getSectionNavigationCategories(section).length;
            return `
                <div class="dashboard-panel">
                    <div class="dashboard-panel-surface">
                        <div class="dashboard-workspace-panel" style="--section-color:${accent}; --section-soft:${softAccent};">
                            <span class="dashboard-workspace-icon"><i class="fas ${escapeDashboardHtml(section.icon || 'fa-folder-open')}"></i></span>
                            <div class="dashboard-workspace-title">${escapeDashboardHtml(section.name || id)}</div>
                            <div class="dashboard-workspace-copy">\uC67C\uCABD\uC5D0\uC11C \uD558\uC704 \uBA54\uB274\uB97C \uB20C\uB7EC \uBC14\uB85C \uC774\uB3D9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.</div>
                            <div class="dashboard-workspace-meta">${visibleCategoryCount}\uAC1C \uD56D\uBAA9</div>
                        </div>
                    </div>
                </div>
            `;
        }

        function getSectionNavigationCategories(section = null) {
            const categories = Array.isArray(section?.categories) ? section.categories : [];
            return categories
                .map((category, index) => ({ category, index }))
                .filter(entry => entry.category?.navHidden !== true)
                .filter(entry => entry.category?.ownerOnly !== true || canShowOwnerWorkspace());
        }

        function renderDashboardSideNav(sections = null, selectedEntry = null) {
            const sideNav = document.getElementById('dashboard-side-nav');
            if (!sideNav) return;
            const entries = Array.isArray(sections) ? sections : getDashboardSections();
            const activeEntry = selectedEntry || getDashboardSelectedEntry(entries);
            const selectedSectionId = getNavigationSelectionSectionId();
            sideNav.innerHTML = entries.map(entry => {
                const isActive = entry.id === activeEntry?.id;
                const navCategories = getSectionNavigationCategories(entry.section);
                const shouldKeepDirectLaunchSubmenuVisible = entry.section?.directLaunch === true && navCategories.length > 0;
                const actionIcon = entry.section?.directLaunch === true
                    ? 'fa-arrow-up-right-from-square'
                    : 'fa-chevron-right';
                const sectionAction = entry.section?.directLaunch === true
                    ? `openSection('${entry.id}')`
                    : `setDashboardSection('${entry.id}')`;
                return `
                    <div class="dashboard-tree-group${isActive ? ' active' : ''}${shouldKeepDirectLaunchSubmenuVisible ? ' is-expanded' : ''}" style="--section-color:${entry.accent}; --section-soft:${entry.softAccent};">
                        <button type="button" class="dashboard-tree-main${isActive ? ' active' : ''}" onclick="${sectionAction}">
                            <span class="dashboard-tree-main-head">
                                <span class="dashboard-side-button-icon"><i class="fas ${escapeDashboardHtml(entry.section.icon || 'fa-folder-open')}"></i></span>
                                <span class="dashboard-side-button-copy">
                                    <span class="dashboard-side-button-label">${escapeDashboardHtml(entry.section.name || entry.id)}</span>
                                </span>
                            </span>
                            <span class="dashboard-tree-chevron"><i class="fas ${actionIcon}"></i></span>
                        </button>
                        <div class="dashboard-tree-submenu">
                            ${navCategories.map(({ category, index }) => {
                                const isActiveCategory = selectedSectionId === entry.id && getNavigationSelectionCategoryIndex(entry.id) === index;
                                return `
                                <button type="button" class="dashboard-tree-subitem${isActiveCategory ? ' active' : ''}" onclick="openSectionCategory('${entry.id}', ${index})"${isActiveCategory ? ' aria-current="page"' : ''}>
                                    <span class="dashboard-tree-subitem-title">${escapeDashboardHtml(category.title || `\uD56D\uBAA9 ${index + 1}`)}</span>
                                </button>
                            `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderDashboardHome() {
            const sideNav = document.getElementById('dashboard-side-nav');
            const stageTitle = document.getElementById('dashboard-stage-title');
            const stageCount = document.getElementById('dashboard-stage-count');
            const subtabBar = document.getElementById('dashboard-subtabs');
            const panelContainer = document.getElementById('dashboard-home-panels');
            if (!sideNav || !stageTitle || !stageCount || !subtabBar || !panelContainer) return;
            const sections = getDashboardSections();
            const selectedEntry = getDashboardSelectedEntry(sections);
            const selectedCategories = getSectionNavigationCategories(selectedEntry?.section);
            renderDashboardSideNav(sections, selectedEntry);

            stageTitle.textContent = selectedEntry?.section?.name || '\uB300\uC2DC\uBCF4\uB4DC';
            stageCount.textContent = `${selectedCategories.length}\uAC1C`;
            subtabBar.innerHTML = '';

            panelContainer.innerHTML = buildDashboardSectionPanelHtml(selectedEntry);

            syncDashboardLastModified();
        }

        function setDashboardSection(sectionId) {
            const normalizedSectionId = getDashboardSectionKey(sectionId);
            const section = AppData[normalizedSectionId];
            if (section?.directLaunch === true) {
                openCategoryLaunch(section);
                return;
            }
            DashboardHomeState.sectionId = normalizedSectionId;
            renderDashboardHome();
        }

        function openSectionCategory(sectionId, categoryIndex = 0) {
            const normalizedIndex = Number.isFinite(Number(categoryIndex)) ? Number(categoryIndex) : 0;
            const data = AppData[sectionId];
            if (!data) return;
            SidebarTreeState.expandedSections[sectionId] = true;
            selectCategory(sectionId, normalizedIndex, { __allowLaunch: true });
        }

        function resolveSectionCategoryIndex(sectionId = '', matcher = {}) {
            const data = AppData[sectionId];
            const categories = Array.isArray(data?.categories) ? data.categories : [];
            if (!categories.length) return -1;
            const preferredIndex = Number.isFinite(Number(matcher.index)) ? Number(matcher.index) : -1;
            if (preferredIndex >= 0 && preferredIndex < categories.length) {
                return preferredIndex;
            }
            const dataKey = String(matcher.dataKey || '').trim();
            if (dataKey) {
                const byDataKey = categories.findIndex(category => String(category?.dataKey || '').trim() === dataKey);
                if (byDataKey >= 0) return byDataKey;
            }
            const title = String(matcher.title || '').trim();
            if (title) {
                const byTitle = categories.findIndex(category => String(category?.title || '').trim() === title);
                if (byTitle >= 0) return byTitle;
            }
            const view = String(matcher.view || '').trim();
            if (view) {
                const byView = categories.findIndex(category => String(category?.view || '').trim() === view);
                if (byView >= 0) return byView;
            }
            return -1;
        }

        function resolveCategoryShortcut(category = null) {
            const target = category?.shortcutTarget;
            if (!target || typeof target !== 'object') return null;
            const sectionId = String(target.sectionId || '').trim();
            if (!sectionId) return null;
            const categoryIndex = resolveSectionCategoryIndex(sectionId, target);
            if (categoryIndex < 0) return null;
            return {
                sectionId,
                categoryIndex,
                options: target.options && typeof target.options === 'object'
                    ? { ...target.options }
                    : {}
            };
        }

        function openSection(id) {
            const data = AppData[id];
            if (!data) return;
            if (data.directLaunch === true) {
                openCategoryLaunch(data);
                return;
            }
            setNavigationSelection(id, -1);
            SidebarTreeState.expandedSections[id] = true;
            renderDashboardSideNav();
            document.getElementById('dashboard')?.classList.add('hidden-view');
            if (data.categories && data.categories.length > 0) {
                const defaultOptions = KpiRuntime?.getDefaultOpenOptions?.(id, { section: data }) || {};
                selectCategory(data.id, 0, defaultOptions);
                return;
            }
            activeSectionId = id;
            activeCategoryIndex = -1;
            activeRenderContext = null;
            updateViewerTitle(id, null);
            renderSidebar();
            scheduleGlobalSaveUiRefresh({ forceDefault: true });
        }

        function goHome() {
            void window.KpiMeteringBridge?.destroyIntegratedMeteringMount?.();
            activeSectionId = null;
            activeCategoryIndex = -1;
            NavigationSelectionState.categoryIndex = -1;
            NavigationSelectionState.teamDataKey = '';
            document.getElementById('dashboard')?.classList.add('hidden-view');
            activeRenderContext = null;
            collapseSidebarSections();
            updateViewerTitle();
            renderSidebar();
            renderViewerHome();
            scheduleGlobalSaveUiRefresh({ forceDefault: true });
        }
