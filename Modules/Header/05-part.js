/* ---------------------------------------------------------------------
     * 1. KHỞI TẠO THANH TOPBAR (Take Task, Tiền, Key + Menu thời gian ẩn/hiện)
     * --------------------------------------------------------------------- */
    function initTopbarControls() {
        const themeToggleBtn = document.querySelector('[data-testid="theme-toggle"]');
        const appHeader = document.querySelector('div[data-app-header="true"]');

        // Nếu chưa có appHeader hoặc đã khởi tạo wrapper rồi thì bỏ qua
        if (!appHeader || document.getElementById("tb-fetch-control-wrapper")) return;

        const isMobile = window.innerWidth < 768;

        let isActive = localStorage.getItem(STORAGE_KEYS.active) !== null ? JSON.parse(localStorage.getItem(STORAGE_KEYS.active)) : false;
        let currentPoll = localStorage.getItem(STORAGE_KEYS.poll) !== null ? parseInt(localStorage.getItem(STORAGE_KEYS.poll), 10) : POLL_INTERVAL;
        let currentDuration = localStorage.getItem(STORAGE_KEYS.duration) !== null ? parseInt(localStorage.getItem(STORAGE_KEYS.duration), 10) : MIN_DURATION_SECONDS;

        POLL_INTERVAL = currentPoll;
        MIN_DURATION_SECONDS = currentDuration;

        const wrapper = document.createElement("div");
        wrapper.id = "tb-fetch-control-wrapper";

        if (isMobile) {
            // === MOBILE: Thành 1 dòng riêng biệt ngay dưới header Workspace, scroll ngang mượt mà ===
            wrapper.className = "flex items-center gap-2 overflow-x-auto py-1.5 px-3 w-full bg-tag-gray-bg/95 border-b border-tb-border shrink-0";
            wrapper.style.cssText = `
            width: 100% !important;
            max-width: 100% !important;
            display: flex !important;
            flex-wrap: nowrap !important;
            white-space: nowrap !important;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
            z-index: 40;
        `;

            if (!document.getElementById('tb-fetch-scroll-style')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'tb-fetch-scroll-style';
                styleEl.innerHTML = `
                #tb-fetch-control-wrapper::-webkit-scrollbar {
                    display: none;
                }
                #tb-fetch-control-wrapper > * {
                    flex-shrink: 0 !important;
                }
            `;
                document.head.appendChild(styleEl);
            }
        } else {
            // === LAPTOP: Nằm ngang cạnh nút theme toggle ===
            wrapper.className = "flex items-center gap-2 mr-2 bg-tag-gray-bg/40 px-2 py-1 rounded-md border border-tb-border shrink-0 relative";
        }

        const earningsDisplay = document.createElement("span");
        earningsDisplay.id = "tb-earnings-display";
        earningsDisplay.className = "text-xs font-bold text-emerald-400 whitespace-nowrap mr-1";
        earningsDisplay.textContent = "💰 0 đ";
        wrapper.appendChild(earningsDisplay);

        // Group chứa nút Take Task và nút mũi tên toggle (Đảm bảo flex khít tuyệt đối)
        const taskGroup = document.createElement("div");
        taskGroup.className = "inline-flex items-center rounded-md overflow-hidden shrink-0";
        taskGroup.style.cssText = "display: inline-flex !important; position: relative; border-radius: 6px; box-sizing: border-box;";

        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        // Bo góc trái, bỏ bo góc phải để dán khít vào nút mũi tên
        toggleBtn.className = "inline-flex h-7 items-center justify-center px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90";
        toggleBtn.style.cssText = "border-top-left-radius: 10px; border-bottom-left-radius: 10px; border-top-right-radius: 0; border-bottom-right-radius: 0; border: none; margin: 0;";

        function updateToggleButton() {
            toggleBtn.textContent = isActive ? "Take Task: ON " : "Take Task: OFF ";
            toggleBtn.style.backgroundColor = isActive ? "#2563eb" : "#dc2626";
        }
        updateToggleButton();

        // Nút mũi tên: Bo góc phải, dán khít cạnh trái
        const arrowBtn = document.createElement("button");
        arrowBtn.type = "button";
        arrowBtn.innerHTML = "▶";

        function updateArrowStyle() {
            const baseColor = isActive ? "#2563eb" : "#dc2626"; // Xanh khi ON, Đỏ khi OFF
            arrowBtn.className = "inline-flex h-7 w-6 items-center justify-center text-xs text-white transition-colors";
            arrowBtn.style.cssText = `
            background-color: ${isActive ? "#4d6fd5" : "#ff3a2c"};
            border-top: 1px solid ${baseColor};
            border-bottom: 1px solid ${baseColor};
            border-right: 1px solid ${baseColor};
            border-left: 1px solid rgba(255, 255, 255, 0.25);
            border-top-right-radius: 10px;
            border-bottom-right-radius: 10px;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            margin: 0;
            padding: 0;
        `;
        }
        updateArrowStyle();

        // Sự kiện click nút Take Task
        toggleBtn.onclick = () => {
            isActive = !isActive;
            localStorage.setItem(STORAGE_KEYS.active, JSON.stringify(isActive));
            updateToggleButton();
            updateArrowStyle();
            if (isActive) { stopped = false; tick(); }
            else { stop(); }
        };
        taskGroup.appendChild(toggleBtn);
        taskGroup.appendChild(arrowBtn);

        wrapper.appendChild(taskGroup);

        // --- CONTAINER CHỨA 2 Ô NHẬP THỜI GIAN (ẨN MẶC ĐỊNH) ---
        const timeSettingsContainer = document.createElement("div");
        timeSettingsContainer.id = "tb-time-settings-popup";
        timeSettingsContainer.className = "hidden items-center gap-1.5 shrink-0";

        let hideTimeout = null;

        function resetHideTimer() {
            if (hideTimeout) clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                timeSettingsContainer.classList.add("hidden");
                timeSettingsContainer.classList.remove("flex");
                arrowBtn.innerHTML = "▶";
            }, 5000); // 10 giây không tương tác sẽ tự ẩn
        }

        arrowBtn.onclick = (e) => {
            e.stopPropagation();
            const isHidden = timeSettingsContainer.classList.contains("hidden");
            if (isHidden) {
                timeSettingsContainer.classList.remove("hidden");
                timeSettingsContainer.classList.add("flex");
                arrowBtn.innerHTML = "◀";
                resetHideTimer();
            } else {
                timeSettingsContainer.classList.add("hidden");
                timeSettingsContainer.classList.remove("flex");
                arrowBtn.innerHTML = "▶";
                if (hideTimeout) clearTimeout(hideTimeout);
            }
        };

        timeSettingsContainer.addEventListener("input", resetHideTimer);
        timeSettingsContainer.addEventListener("click", (e) => {
            e.stopPropagation();
            resetHideTimer();
        });

        const pollInput = document.createElement("input");
        pollInput.type = "number";
        pollInput.value = currentPoll;
        pollInput.title = "Poll Interval (ms)";
        pollInput.className = "w-16 px-1.5 py-0.5 text-xs rounded bg-canvas border border-tb-border text-fg text-center shrink-0";
        pollInput.onchange = e => {
            const val = parseInt(e.target.value, 10);
            if (val >= 500) {
                POLL_INTERVAL = val;
                localStorage.setItem(STORAGE_KEYS.poll, val);
            }
        };

        const durationInput = document.createElement("input");
        durationInput.type = "number";
        durationInput.value = currentDuration;
        durationInput.title = "Min Duration (s)";
        durationInput.className = "w-16 px-1.5 py-0.5 text-xs rounded bg-canvas border border-tb-border text-fg text-center shrink-0";
        durationInput.onchange = e => {
            const val = parseInt(e.target.value, 10);
            if (val >= 0) {
                MIN_DURATION_SECONDS = val;
                localStorage.setItem(STORAGE_KEYS.duration, val);
            }
        };

        timeSettingsContainer.appendChild(pollInput);
        timeSettingsContainer.appendChild(durationInput);
        wrapper.appendChild(timeSettingsContainer);

        // --- XỬ LÝ NÚT API KEY & MODAL ---
        window.getStoredApiKey = function () {
            const saved = localStorage.getItem(STORAGE_KEYS.token);
            return saved ? JSON.parse(saved) : (typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : "");
        };

        const btnKey = document.createElement("button");
        btnKey.type = "button";
        btnKey.className = "inline-flex h-7 items-center justify-center rounded-md px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 shrink-0";
        btnKey.style.backgroundColor = "#64748b";
        btnKey.textContent = "🔑 Key";

        const tokenModal = document.createElement("div");
        tokenModal.style.cssText = "display: none; position: absolute; top: 40px; right: 0; background: #1e293b; border: 1px solid #475569; padding: 12px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); width: 260px;";

        tokenModal.innerHTML = `
        <div style="font-size: 11px; color: #f8fafc; margin-bottom: 6px; font-weight: 600;">Nhập Gemini API Key:</div>
        <input type="password" id="tb-token-input" value="${window.getStoredApiKey()}" placeholder="Dán API Key vào đây..." style="width: 100%; height: 26px; background: #0f172a; color: #fff; border: 1px solid #64748b; border-radius: 4px; padding: 0 6px; font-size: 11px; margin-bottom: 8px; box-sizing: border-box;" />
        <div style="display: flex; justify-content: flex-end; gap: 6px;">
            <button type="button" id="tb-token-save" style="background: #10b981; color: white; border: none; padding: 3px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">Lưu</button>
            <button type="button" id="tb-token-close" style="background: #475569; color: white; border: none; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Đóng</button>
        </div>
    `;

        btnKey.onclick = (e) => {
            e.stopPropagation();
            const isVisible = tokenModal.style.display === "block";
            tokenModal.style.display = isVisible ? "none" : "block";
            if (!isVisible) {
                tokenModal.querySelector("#tb-token-input").value = window.getStoredApiKey();
            }
        };

        setTimeout(() => {
            const saveBtn = tokenModal.querySelector('#tb-token-save');
            const closeBtn = tokenModal.querySelector('#tb-token-close');
            const inputEl = tokenModal.querySelector('#tb-token-input');

            if (saveBtn) {
                saveBtn.onclick = () => {
                    const newKey = inputEl.value.trim();
                    localStorage.setItem(STORAGE_KEYS.token, JSON.stringify(newKey));
                    tokenModal.style.display = 'none';
                };
            }
            if (closeBtn) {
                closeBtn.onclick = () => {
                    tokenModal.style.display = 'none';
                };
            }
        }, 100);

        wrapper.appendChild(btnKey);
        wrapper.appendChild(tokenModal);

        if (isMobile) {
            appHeader.insertAdjacentElement("afterend", wrapper);
        } else {
            if (themeToggleBtn) {
                themeToggleBtn.insertAdjacentElement("beforebegin", wrapper);
            }
        }

        updateMyEarnings();
        setInterval(updateMyEarnings, 30000);
    }

    /* ---------------------------------------------------------------------
     * 2. KHỞI TẠO TOOLBAR TRONG TASK (Fill 1, Fill All, Copy, Paste...)
     * --------------------------------------------------------------------- */
    function injectTaskToolbar() {
        // Tìm container của cả 2 trang (Task thường OR Task Review/Fix)
        const taskContainer = document.querySelector('div[data-testid="task-submitted"]')
            || document.querySelector('div[data-testid="task-review-view"]');

        if (!taskContainer || document.getElementById('tb-inject-fill')) return;

        const isMobile = window.innerWidth < 768;

        // Tìm hoặc tạo headerSection bên trong taskContainer
        const firstChild = taskContainer.firstElementChild;
        let headerSection = null;

        if (firstChild && firstChild.classList.contains('border-b') && firstChild.classList.contains('justify-between')) {
            headerSection = firstChild;
        }

        if (!headerSection) {
            headerSection = document.createElement('div');
            headerSection.className = isMobile
                ? 'flex flex-col items-start gap-2 border-b border-tb-border px-3 pb-3 pt-3 w-full'
                : 'flex items-center justify-between gap-3 border-b border-tb-border px-5 pb-3 pt-4';

            const titleDiv = document.createElement('div');
            titleDiv.className = isMobile ? 'w-full' : '';
            titleDiv.innerHTML = `
            <h2 class="text-sm font-medium text-fg">Task Editor Controls</h2>
            <p class="mt-0.5 text-2xs text-fg-muted">Automated toolbar for fast segment tagging</p>
        `;
            headerSection.appendChild(titleDiv);
            taskContainer.insertBefore(headerSection, taskContainer.firstChild);
        } else {
            headerSection.className = isMobile
                ? 'flex flex-col items-start gap-2 border-b border-tb-border px-3 pb-3 pt-3 w-full'
                : 'flex items-center justify-between gap-3 border-b border-tb-border px-5 pb-3 pt-4';
        }

        const btnBaseClass = "inline-flex h-7 items-center justify-center rounded-md px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 shrink-0";

        const helperToolbar = document.createElement('div');
        helperToolbar.id = 'tb-helper-toolbar';

        if (isMobile) {
            helperToolbar.className = 'flex items-center gap-2 overflow-x-auto py-1 w-full shrink-0';
            helperToolbar.style.cssText = `
            width: 100% !important;
            max-width: 100% !important;
            display: flex !important;
            flex-wrap: nowrap !important;
            white-space: nowrap !important;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
        `;
        } else {
            helperToolbar.className = 'flex items-center gap-2 ml-auto shrink-0 flex-wrap';
        }

        if (!document.getElementById('tb-scroll-hide-style')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'tb-scroll-hide-style';
            styleEl.innerHTML = `
            #tb-helper-toolbar::-webkit-scrollbar {
                display: none;
            }
            #tb-helper-toolbar > * {
                flex-shrink: 0 !important;
            }
        `;
            document.head.appendChild(styleEl);
        }

        // --- CÁC NÚT BẤM VÀ INPUT TRONG TOOLBAR ---
        const l3Input = document.createElement('input');
        l3Input.id = 'tb-l3-custom-input';
        l3Input.type = 'text';
        l3Input.placeholder = 'Enter L3...';
        l3Input.style.cssText = 'height: 28px; width: 110px; background-color: #ffffff !important; color: #000000 !important; border: 1px solid #cbd5e1 !important; border-radius: 6px; padding: 0 8px; font-size: 12px; flex-shrink: 0;';

        const dropdown = document.createElement('div');
        dropdown.id = 'tb-l3-dropdown';
        dropdown.style.cssText = 'display: none; position: absolute; top: 32px; left: 0; width: 200px; max-height: 220px; overflow-y: auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; z-index: 99999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';

        function renderDropdown(filter = '') {
            dropdown.innerHTML = '';
            const filtered = GLOBAL_L3_LIST.filter(item => item.toLowerCase().includes(filter.toLowerCase())).slice(0, 20);
            if (filtered.length === 0) {
                dropdown.style.display = 'none';
                return;
            }
            filtered.forEach(item => {
                const div = document.createElement('div');
                div.textContent = item;
                div.style.cssText = 'padding: 6px 10px; font-size: 11px; color: #1e293b; cursor: pointer; border-bottom: 1px solid #f1f5f9;';
                div.onmouseover = () => div.style.background = '#e2e8f0';
                div.onmouseout = () => div.style.background = '#ffffff';
                div.onmousedown = (e) => {
                    e.preventDefault();
                    l3Input.value = item;
                    dropdown.style.display = 'none';
                };
                dropdown.appendChild(div);
            });
            dropdown.style.display = 'block';
        }

        l3Input.addEventListener('input', (e) => renderDropdown(e.target.value));
        l3Input.addEventListener('focus', () => renderDropdown(l3Input.value));
        l3Input.addEventListener('blur', () => setTimeout(() => dropdown.style.display = 'none', 200));

        const l3Wrapper = document.createElement('div');
        l3Wrapper.className = 'relative flex items-center shrink-0';
        l3Wrapper.appendChild(l3Input);
        l3Wrapper.appendChild(dropdown);

        const btnFill = document.createElement('button');
        btnFill.id = 'tb-inject-fill';
        btnFill.type = 'button';
        btnFill.className = btnBaseClass;
        btnFill.style.cssText = 'background-color: #4f46e5;';
        btnFill.innerHTML = '⚡ Fill 1';
        btnFill.addEventListener('click', runAutoFill);

        const btnLoop = document.createElement('button');
        btnLoop.id = 'tb-inject-loop';
        btnLoop.type = 'button';
        btnLoop.className = `tb-inject-loop-btn ${btnBaseClass}`;
        btnLoop.style.cssText = 'background-color: #4338ca;';
        btnLoop.innerHTML = '🔄 Fill All';
        btnLoop.addEventListener('click', runLoopAllEpisodes);

        const btnFillL3Loop = document.createElement('button');
        btnFillL3Loop.id = 'tb-inject-l3-loop';
        btnFillL3Loop.type = 'button';
        btnFillL3Loop.className = `tb-inject-fill-l3-loop-btn ${btnBaseClass}`;
        btnFillL3Loop.style.cssText = 'background-color: #059669;';
        btnFillL3Loop.innerHTML = '🔄 Fill L3 All';
        btnFillL3Loop.addEventListener('click', runLoopFillL3);

        const btnCopy = document.createElement('button');
        btnCopy.id = 'tb-inject-copy';
        btnCopy.type = 'button';
        btnCopy.className = btnBaseClass;
        btnCopy.style.cssText = 'background-color: #6366f1;';
        btnCopy.innerHTML = '📋 Copy';
        btnCopy.addEventListener('click', runCopySegment);

        const btnPaste = document.createElement('button');
        btnPaste.id = 'tb-inject-paste';
        btnPaste.type = 'button';
        btnPaste.className = btnBaseClass;
        btnPaste.style.cssText = 'background-color: #0ea5e9;';
        btnPaste.innerHTML = '📥 Paste';
        btnPaste.addEventListener('click', runPasteSegment);

        const btnRework = document.createElement('button');
        btnRework.id = 'tb-inject-rework';
        btnRework.type = 'button';
        btnRework.className = btnBaseClass;
        btnRework.style.cssText = 'background-color: #f59e0b;';
        btnRework.innerHTML = '🔄 Rework task';
        btnRework.addEventListener('click', runReworkTask);

        helperToolbar.appendChild(l3Wrapper);
        helperToolbar.appendChild(btnFillL3Loop);
        helperToolbar.appendChild(btnFill);
        helperToolbar.appendChild(btnLoop);
        helperToolbar.appendChild(btnPaste);
        helperToolbar.appendChild(btnCopy);
        helperToolbar.appendChild(btnRework);

        headerSection.appendChild(helperToolbar);
    }

    // Hàm tổng hợp gọi định kỳ để đảm bảo cả Topbar và Task Toolbar luôn sẵn sàng trên mọi trang
    function injectUIControls() {
        initTopbarControls();
        injectTaskToolbar();
    }

    document.addEventListener('keydown', function (e) {
        // Chỉ kích hoạt khi không gõ trong ô input/textarea khác (ngoại trừ ô nhập L3 tùy chỉnh)
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const activeId = document.activeElement ? document.activeElement.id : '';

        if (activeTag === 'textarea' || (activeTag === 'input' && activeId !== 'tb-l3-custom-input')) {
            return;
        }

        if (e.key === '!') {
            e.preventDefault();
            const btn = document.getElementById('tb-inject-fill');
            if (btn) btn.click();
        } else if (e.key === '@') {
            e.preventDefault();
            const btn = document.getElementById('tb-inject-loop'); // Nút "Fill All" (Loop All)
            if (btn) btn.click();
        } else if (e.key === '#') {
            e.preventDefault();
            const btn = document.getElementById('tb-inject-l3-loop'); // Nút "Fill L3 All"
            if (btn) btn.click();
        } else if (e.key === '$') {
            e.preventDefault();
            const btn = document.getElementById('tb-inject-paste'); // Nút "Paste"
            if (btn) btn.click();
        }
    });

    // Optimized: one debounced observer replaces repeated 500 ms UI polling.
    let tbUiScheduled = false;
    function scheduleTbUiRefresh() {
        if (tbUiScheduled) return;
        tbUiScheduled = true;
        setTimeout(() => {
            tbUiScheduled = false;
            inject10xButton();
            injectUIControls();
            bindTimelineEarningsObserver();
            if (typeof window.__tbInjectSegUI === 'function') window.__tbInjectSegUI();
        }, 80);
    }
    const tbUiObserver = new MutationObserver(scheduleTbUiRefresh);
    tbUiObserver.observe(document.documentElement, { childList: true, subtree: true });
    scheduleTbUiRefresh();
    console.log('✅ Master Tbrain Script (No Tool in Activity) is ready.');

    