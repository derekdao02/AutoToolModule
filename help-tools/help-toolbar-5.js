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

    const splitGroupStyle = `
        display: inline-flex;
        align-items: center;
        height: 28px;

        border-radius: 10px;
        overflow: hidden;

        flex-shrink: 0;
        box-shadow: 0 1px 3px rgba(0,0,0,.20);
    `;

    const splitBtnStyle = `
        height: 28px;
        border: none;
        border-radius: 0;
        padding: 0 10px;
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;

        transition:
            filter 0.12s ease,
            box-shadow 0.12s ease,
            transform 0.08s ease;

        position: relative;
    `;

    function addButtonHover(btn) {
        btn.addEventListener('mouseenter', () => {
            if (btn.disabled) return;

            btn.style.filter = 'brightness(1.25)';
            btn.style.boxShadow = '0 0 8px rgba(255,255,255,.25)';
            btn.style.zIndex = '2';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.filter = '';
            btn.style.boxShadow = '';
            btn.style.transform = '';
            btn.style.zIndex = '';
        });

        btn.addEventListener('mousedown', () => {
            if (btn.disabled) return;

            btn.style.filter = 'brightness(.9)';
            btn.style.transform = 'scale(.97)';
        });

        btn.addEventListener('mouseup', () => {
            if (btn.disabled) return;

            btn.style.filter = 'brightness(1.25)';
            btn.style.transform = '';
        });
    }

    // =====================================================
    // L3 INPUT + AUTOCOMPLETE
    // =====================================================

    let l3Suggestions = [];
    let l3ActiveIndex = -1;

    const l3Input = document.createElement('input');
    l3Input.id = 'tb-l3-custom-input';
    l3Input.type = 'text';
    l3Input.placeholder = 'Enter L3...';
    l3Input.autocomplete = 'off';

    l3Input.style.cssText = `
        height: 28px;
        width: 110px;
        background: #ffffff !important;
        color: #0f172a !important;
        border: none !important;
        border-radius: 10px 0 0 10px !important;
        padding: 0 9px;
        font-size: 12px;
        outline: none;
        flex-shrink: 0;
        transition:
            box-shadow 0.12s ease,
            background-color 0.12s ease;
    `;

    // =====================================================
    // L3 DROPDOWN
    // =====================================================

    const dropdown = document.createElement('div');
    dropdown.id = 'tb-l3-dropdown';

    dropdown.style.cssText = `
        display: none;
        position: absolute;
        top: calc(100% + 5px);
        left: 0;
        width: 240px;
        max-height: 240px;
        overflow-y: auto;
        overflow-x: hidden;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        z-index: 999999;
        box-shadow:
            0 8px 18px rgba(0,0,0,.18),
            0 2px 6px rgba(0,0,0,.10);
        scrollbar-width: thin;
    `;

    function isL3DropdownOpen() {
        return dropdown.style.display === 'block' && l3Suggestions.length > 0;
    }

    function closeL3Dropdown() {
        dropdown.style.display = 'none';
        l3ActiveIndex = -1;
    }

    function selectL3Suggestion(index) {
        const selectedValue = l3Suggestions[index];
        if (!selectedValue) return;

        l3Input.value = selectedValue;
        closeL3Dropdown();

        // Báo cho các logic khác rằng giá trị L3 đã thay đổi.
        l3Input.dispatchEvent(new Event('change', { bubbles: true }));

        l3Input.focus();
        const cursorPosition = l3Input.value.length;
        l3Input.setSelectionRange(cursorPosition, cursorPosition);
    }

    function updateL3ActiveItem() {
        const items = dropdown.querySelectorAll('[data-l3-index]');

        items.forEach((itemElement, index) => {
            const isActive = index === l3ActiveIndex;

            if (isActive) {
                itemElement.style.backgroundColor = '#059669';
                itemElement.style.color = '#ffffff';
                itemElement.style.fontWeight = '600';
                itemElement.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest'
                });
            } else {
                itemElement.style.backgroundColor = '#ffffff';
                itemElement.style.color = '#1e293b';
                itemElement.style.fontWeight = '400';
            }
        });
    }

    function renderDropdown(filter = '') {
        dropdown.innerHTML = '';
        l3ActiveIndex = -1;

        const normalizedFilter = String(filter).trim().toLowerCase();
        const sourceList = Array.isArray(GLOBAL_L3_LIST) ? GLOBAL_L3_LIST : [];

        l3Suggestions = sourceList
            .filter(item => String(item).toLowerCase().includes(normalizedFilter))
            .slice(0, 20);

        if (l3Suggestions.length === 0) {
            closeL3Dropdown();
            return;
        }

        l3Suggestions.forEach((item, index) => {
            const suggestionElement = document.createElement('div');
            suggestionElement.textContent = item;
            suggestionElement.dataset.l3Index = String(index);

            suggestionElement.style.cssText = `
                display: block;
                width: 100%;
                box-sizing: border-box;
                padding: 7px 10px;
                font-size: 11px;
                line-height: 16px;
                color: #1e293b;
                background-color: #ffffff;
                cursor: pointer;
                user-select: none;
                border-bottom: 1px solid #f1f5f9;
                white-space: normal;
                word-break: break-word;
                transition:
                    background-color 0.10s ease,
                    color 0.10s ease;
            `;

            suggestionElement.addEventListener('mouseenter', () => {
                l3ActiveIndex = index;
                updateL3ActiveItem();
            });

            // Dùng mousedown để chọn trước khi input blur và đóng dropdown.
            suggestionElement.addEventListener('mousedown', event => {
                event.preventDefault();
                event.stopPropagation();
                selectL3Suggestion(index);
            });

            dropdown.appendChild(suggestionElement);
        });

        dropdown.style.display = 'block';
    }

    l3Input.addEventListener('input', event => {
        renderDropdown(event.target.value);
    });

    l3Input.addEventListener('focus', () => {
        l3Input.style.boxShadow = `
            inset 0 0 0 2px #10b981,
            0 0 8px rgba(16,185,129,.30)
        `;
        renderDropdown(l3Input.value);
    });

    l3Input.addEventListener('blur', () => {
        l3Input.style.boxShadow = '';
        setTimeout(closeL3Dropdown, 150);
    });

    // ArrowUp/ArrowDown để di chuyển, Enter để chọn và Escape để đóng.
    l3Input.addEventListener('keydown', event => {
        const dropdownOpen = isL3DropdownOpen();

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            if (!dropdownOpen) {
                renderDropdown(l3Input.value);
                if (l3Suggestions.length > 0) {
                    l3ActiveIndex = 0;
                    updateL3ActiveItem();
                }
                return;
            }

            l3ActiveIndex = (l3ActiveIndex + 1) % l3Suggestions.length;
            updateL3ActiveItem();
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            if (!dropdownOpen) {
                renderDropdown(l3Input.value);
                if (l3Suggestions.length > 0) {
                    l3ActiveIndex = l3Suggestions.length - 1;
                    updateL3ActiveItem();
                }
                return;
            }

            l3ActiveIndex = l3ActiveIndex <= 0
                ? l3Suggestions.length - 1
                : l3ActiveIndex - 1;
            updateL3ActiveItem();
            return;
        }

        if (event.key === 'Enter') {
            if (dropdownOpen && l3ActiveIndex < 0 && l3Suggestions.length > 0) {
                l3ActiveIndex = 0;
            }

            if (dropdownOpen && l3ActiveIndex >= 0) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                selectL3Suggestion(l3ActiveIndex);
            }
            return;
        }

        if (event.key === 'Escape' && dropdownOpen) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            closeL3Dropdown();
        }
    });

    // =====================================================
    // L3 INPUT WRAPPER
    // =====================================================

    const l3Wrapper = document.createElement('div');
    l3Wrapper.style.cssText = `
        position: relative;
        display: flex;
        align-items: center;
        height: 28px;
        border-radius: 10px 0 0 10px;
        overflow: visible;
        flex-shrink: 0;
    `;

    l3Wrapper.appendChild(l3Input);
    l3Wrapper.appendChild(dropdown);

    // =====================================================
    // FILL 1
    // =====================================================

    const btnFill = document.createElement('button');

    btnFill.id = 'tb-inject-fill';
    btnFill.type = 'button';

    btnFill.className = btnBaseClass;

    btnFill.style.cssText = splitBtnStyle + `
    background-color: #7c3aed;
    border-right: 1px solid rgba(255,255,255,.30);
`;

    btnFill.innerHTML = '⚡ Fill 1';

    btnFill.addEventListener(
        'click',
        runAutoFill
    );


    // =====================================================
    // FILL ALL
    // =====================================================

    const btnLoop = document.createElement('button');

    btnLoop.id = 'tb-inject-loop';
    btnLoop.type = 'button';

    btnLoop.className =
        `tb-inject-loop-btn ${btnBaseClass}`;

    btnLoop.style.cssText = splitBtnStyle + `
    background-color: #6d28d9;
`;

    btnLoop.innerHTML = '🔄 Fill All';

    btnLoop.addEventListener(
        'click',
        runLoopAllEpisodes
    );


    // =====================================================
    // FILL ALL L3
    // QUAN TRỌNG: tạo button trước khi đưa vào l3Group
    // =====================================================

    const btnFillL3Loop = document.createElement('button');

    btnFillL3Loop.id = 'tb-inject-l3-loop';
    btnFillL3Loop.type = 'button';

    btnFillL3Loop.className =
        `tb-inject-fill-l3-loop-btn ${btnBaseClass}`;

    btnFillL3Loop.style.cssText = splitBtnStyle + `
        background-color: #059669;
        border-left: 1px solid rgba(255,255,255,.30);
        border-radius: 0 10px 10px 0;
    `;

    btnFillL3Loop.innerHTML = '🌐 Fill All L3';

    btnFillL3Loop.addEventListener(
        'click',
        runLoopFillL3
    );


    // =====================================================
    // COPY
    // =====================================================

    const btnCopy = document.createElement('button');

    btnCopy.id = 'tb-inject-copy';
    btnCopy.type = 'button';

    btnCopy.className = btnBaseClass;

    btnCopy.style.cssText = splitBtnStyle + `
    background-color: #2563eb;
    border-right: 1px solid rgba(255,255,255,.30);
`;

    btnCopy.innerHTML = '📋 Copy';

    btnCopy.addEventListener(
        'click',
        runCopySegment
    );


    // =====================================================
    // PASTE
    // =====================================================

    const btnPaste = document.createElement('button');

    btnPaste.id = 'tb-inject-paste';
    btnPaste.type = 'button';

    btnPaste.className = btnBaseClass;

    btnPaste.style.cssText = splitBtnStyle + `
    background-color: #0284c7;
`;

    btnPaste.innerHTML = '📥 Paste';

    btnPaste.addEventListener(
        'click',
        runPasteSegment
    );


    // =====================================================
    // REWORK - GIỮ NGUYÊN NẾU SAU NÀY CẦN
    // =====================================================

    const btnRework = document.createElement('button');

    btnRework.id = 'tb-inject-rework';
    btnRework.type = 'button';
    btnRework.className = btnBaseClass;

    btnRework.style.cssText =
        'background-color: #f59e0b;';

    btnRework.innerHTML = '🔄 Rework task';

    btnRework.addEventListener(
        'click',
        runReworkTask
    );


    // =====================================================
    // GROUP 1: COPY | PASTE
    // =====================================================

    addButtonHover(btnCopy);
    addButtonHover(btnPaste);

    addButtonHover(btnFill);
    addButtonHover(btnLoop);

    addButtonHover(btnFillL3Loop);

    const copyPasteGroup = document.createElement('div');

    copyPasteGroup.style.cssText =
        splitGroupStyle;

    copyPasteGroup.appendChild(btnCopy);
    copyPasteGroup.appendChild(btnPaste);


    // =====================================================
    // GROUP 2: FILL 1 | FILL ALL
    // =====================================================

    const fillGroup = document.createElement('div');

    fillGroup.style.cssText =
        splitGroupStyle;

    fillGroup.appendChild(btnFill);
    fillGroup.appendChild(btnLoop);


    // =====================================================
    // GROUP 3: ENTER L3 | FILL ALL L3
    //
    // btnFillL3Loop ĐÃ được khai báo phía trên rồi.
    // =====================================================

    const l3Group = document.createElement('div');

    l3Group.style.cssText = `
        display: inline-flex;
        align-items: center;
        height: 28px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        overflow: visible;
        flex-shrink: 0;
        box-shadow: 0 1px 3px rgba(0,0,0,.20);
        position: relative;
    `;

    l3Group.appendChild(l3Wrapper);
    l3Group.appendChild(btnFillL3Loop);


    // =====================================================
    // ADD VÀO TOOLBAR
    // =====================================================

    helperToolbar.appendChild(l3Group);
    helperToolbar.appendChild(fillGroup);
    helperToolbar.appendChild(copyPasteGroup);

    headerSection.appendChild(helperToolbar);
}

// Hàm tổng hợp gọi định kỳ để đảm bảo cả Topbar và Task Toolbar luôn sẵn sàng trên mọi trang
function injectUIControls() {
    initTopbarControls();
    injectTaskToolbar();
}

document.addEventListener('keydown', function (e) {
    const activeElement = document.activeElement;
    const activeTag = activeElement
        ? activeElement.tagName.toLowerCase()
        : '';

    // Không chạy hotkey toàn cục khi đang nhập dữ liệu.
    // Ô Enter L3 có listener riêng cho ArrowUp/ArrowDown/Enter/Escape.
    if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeElement?.isContentEditable
    ) {
        return;
    }

    if (e.key === '!') {
        e.preventDefault();
        const btn = document.getElementById('tb-inject-fill');
        if (btn) btn.click();
    } else if (e.key === '@') {
        e.preventDefault();
        const btn = document.getElementById('tb-inject-loop');
        if (btn) btn.click();
    } else if (e.key === '#') {
        e.preventDefault();
        const btn = document.getElementById('tb-inject-l3-loop');
        if (btn) btn.click();
    } else if (e.key === '$') {
        e.preventDefault();
        const btn = document.getElementById('tb-inject-paste');
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

