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

        // wrapper.appendChild(btnKey);
        // wrapper.appendChild(tokenModal);

        timeSettingsContainer.appendChild(btnKey);
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

