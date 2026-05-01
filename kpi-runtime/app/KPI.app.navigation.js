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
                        <div class="viewer-home-copy-panel">
                            <h1 class="viewer-home-policy-title">2026\uB144 \uACBD\uC601\uBC29\uCE68</h1>
                            <div class="viewer-home-policy-rule"></div>
                            <div class="viewer-home-policy-points">
                                <p class="viewer-home-policy-line">
                                    <span class="viewer-home-policy-line-icon" aria-hidden="true"><i class="fas fa-arrow-trend-up"></i></span>
                                    <span>\uC0C8\uB85C\uC6B4 \uAE30\uC220\uB825\uC73C\uB85C \uC9C0\uC18D \uC131\uC7A5\uC758 \uAE30\uBC18\uC744 \uAD6C\uCD95\uD569\uC2DC\uB2E4</span>
                                </p>
                                <p class="viewer-home-policy-line viewer-home-policy-line-strong">
                                    <span class="viewer-home-policy-line-icon" aria-hidden="true"><i class="fas fa-brain"></i></span>
                                    <span>AI \uBC0F \uB514\uC9C0\uD138 \uC815\uBCF4\uD654\uB97C \uD1B5\uD574 \uC5C5\uBB34 \uD6A8\uC728\uC744 \uADF9\uB300\uD654\uD569\uC2DC\uB2E4</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <section class="viewer-home-guideline-section" aria-label="\uD589\uB3D9 \uAC15\uB839">
                        <div class="viewer-home-guideline-header">
                            <h2 class="viewer-home-guideline-title">\uC2E0\uC18C\uAC00 \uD589\uB3D9\uAC15\uB839</h2>
                        </div>
                        <div class="viewer-home-guideline-grid">
                            <article class="viewer-home-guideline-card viewer-home-guideline-card-trust">
                                <div class="viewer-home-guideline-icon"><i class="fas fa-handshake"></i></div>
                                <div class="viewer-home-guideline-copy">
                                    <div class="viewer-home-guideline-name">\uC2E0\uB8B0(\u4FE1\u983C)</div>
                                    <div class="viewer-home-guideline-quote">\uC131\uC758\uC788\uACE0, \uC774\uD574\uD558\uACE0, \uBBFF\uACE0, \uC758\uC9C0\uD558\uC790</div>
                                    <div class="viewer-home-guideline-tag">\uC131\uC758\uB85C \uB9FA\uC740 \uAD00\uACC4</div>
                                    <ul class="viewer-home-guideline-list">
                                        <li>\uCC28\uC774\uC640 \uBD80\uC871\uD568\uC744 \uC778\uC815\uD558\uACE0 \uC2A4\uC2A4\uB85C\uB97C \uB4DC\uB7EC\uB0B4\uB294 \uACB8\uC190\uD55C \uC790\uC138</li>
                                        <li>\uC0C1\uB300\uB97C \uBC30\uB824\uD558\uACE0 \uC874\uC911\uD558\uBA70 \uC774\uD574\uD558\uB824\uB294 \uD0DC\uB3C4</li>
                                        <li>\uC874\uC911, \uC0C1\uB2F4, \uCC45\uC784 \uC788\uB294 \uD589\uB3D9\uC744 \uCDE8\uD558\uB294 \uC790\uC138</li>
                                        <li>\uAC1C\uBC29\uC801\uC774\uACE0 \uB530\uB73B\uD55C \uB9C8\uC74C\uC73C\uB85C \uBC1B\uC544\uB4E4\uC774\uB294 \uC790\uC138</li>
                                    </ul>
                                </div>
                            </article>
                            <article class="viewer-home-guideline-card viewer-home-guideline-card-communication">
                                <div class="viewer-home-guideline-icon"><i class="fas fa-comments"></i></div>
                                <div class="viewer-home-guideline-copy">
                                    <div class="viewer-home-guideline-name">\uC18C\uD1B5(\u758F\u901A)</div>
                                    <div class="viewer-home-guideline-quote">\uC0AC\uB78C\uACFC \uB9C8\uC74C\uC744 \uC5F4\uACE0, \uC6C3\uACE0, \uB9D0\uD558\uC790</div>
                                    <div class="viewer-home-guideline-tag">\uC9C4\uC2EC \uC788\uB294 \uB300\uD654</div>
                                    <ul class="viewer-home-guideline-list">
                                        <li>\uAD6C\uCCB4\uC801\uC778 \uBB38\uC81C \uD574\uACB0\uACFC \uC2E4\uCC9C\uC73C\uB85C \uC774\uC5B4\uAC00\uB294 \uC790\uC138</li>
                                        <li>\uC790\uBC1C\uC801\uC774\uBA70 \uCE5C\uC808\uD558\uAC8C \uC791\uC5C5\uD558\uACE0 \uD611\uB825\uD558\uB294 \uBAA8\uC2B5</li>
                                        <li>\uACBD\uCCAD\uD558\uACE0 \uC218\uC6A9\uD558\uB294 \uD0DC\uB3C4</li>
                                        <li>\uC9C4\uC815\uC131\uACFC \uACF5\uAC10\uC744 \uBC14\uD0D5\uC73C\uB85C \uD55C \uC8FC\uCCB4\uC801 \uC790\uC138</li>
                                    </ul>
                                </div>
                            </article>
                            <article class="viewer-home-guideline-card viewer-home-guideline-card-value">
                                <div class="viewer-home-guideline-icon"><i class="fas fa-lightbulb"></i></div>
                                <div class="viewer-home-guideline-copy">
                                    <div class="viewer-home-guideline-name">\uAC00\uCE58\uCC3D\uC870(\u50F9\u5024\u5275\u9020)</div>
                                    <div class="viewer-home-guideline-quote">\uC0DD\uAC01\uD558\uACE0 \uB098\uB204\uACE0 \uBC30\uC6B0\uACE0 \uC5F0\uAD6C\uD558\uBA70 \uC2E4\uD589\uD558\uC790</div>
                                    <div class="viewer-home-guideline-tag">\uCC3D\uC758\uC801 \uC131\uC7A5</div>
                                    <ul class="viewer-home-guideline-list">
                                        <li>\uC548\uC804\uC744 \uD1B5\uD574 \uD559\uD558\uACE0 \uC775\uD788\uACE0 \uB2E4\uC591\uD55C \uAE30\uB2A5\uACFC \uC9C0\uC2DD\uC744 \uD68D\uB4DD\uD558\uB294 \uC790\uC138</li>
                                        <li>\uC0DD\uAC01\uACFC \uC815\uBCF4\uB97C \uB098\uB204\uACE0 \uACF5\uC720\uD558\uB294 \uC790\uC138</li>
                                        <li>\uC0C8\uB85C\uC6B4 \uAE30\uC220\uACFC \uD658\uACBD\uC5D0\uC11C \uC544\uC774\uB514\uC5B4\uB97C \uCC3E\uACE0 \uC2E4\uD589\uD558\uB824\uB294 \uC790\uC138</li>
                                        <li>\uCC3D\uC758\uC801\uC778 \uB9C8\uC778\uB4DC\uB85C \uAC00\uCE58\uB97C \uCD94\uAD6C\uD558\uB294 \uD0DC\uB3C4</li>
                                    </ul>
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
