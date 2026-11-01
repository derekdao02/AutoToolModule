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
    border-radius: 7px;
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
            btn.style.boxShadow = `
            inset 0 0 0 1px rgba(255,255,255,.55),
            0 0 8px rgba(255,255,255,.25)
        `;
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
            btn.style.transform = 'scale(.96)';
        });

        btn.addEventListener('mouseup', () => {
            if (btn.disabled) return;

            btn.style.filter = 'brightness(1.25)';
            btn.style.transform = '';
        });
    }

    // =====================================================
    // L3 INPUT
    // =====================================================

    const l3Input = document.createElement('input');
    l3Input.id = 'tb-l3-custom-input';
    l3Input.type = 'text';
    l3Input.placeholder = 'Enter L3...';

    l3Input.style.cssText = `
    height: 28px;
    width: 110px;
    background: #ffffff !important;
    color: #0f172a !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 0 9px;
    font-size: 12px;
    outline: none;
    flex-shrink: 0;
`;


    // =====================================================
    // L3 DROPDOWN
    // =====================================================

    const dropdown = document.createElement('div');

    dropdown.id = 'tb-l3-dropdown';

    dropdown.style.cssText = `
    display: none;
    position: absolute;
    top: 32px;
    left: 0;
    width: 200px;
    max-height: 220px;
    overflow-y: auto;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    z-index: 99999;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

    function renderDropdown(filter = '') {

        dropdown.innerHTML = '';

        const filtered = GLOBAL_L3_LIST
            .filter(item =>
                item.toLowerCase().includes(filter.toLowerCase())
            )
            .slice(0, 20);

        if (filtered.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        filtered.forEach(item => {

            const div = document.createElement('div');

            div.textContent = item;

            div.style.cssText = `
            padding: 6px 10px;
            font-size: 11px;
            color: #1e293b;
            cursor: pointer;
            border-bottom: 1px solid #f1f5f9;
        `;

            div.onmouseover = () =>
                div.style.background = '#e2e8f0';

            div.onmouseout = () =>
                div.style.background = '#ffffff';

            div.onmousedown = (e) => {
                e.preventDefault();

                l3Input.value = item;

                dropdown.style.display = 'none';
            };

            dropdown.appendChild(div);
        });

        dropdown.style.display = 'block';
    }


    l3Input.addEventListener(
        'input',
        e => renderDropdown(e.target.value)
    );

    l3Input.addEventListener(
        'focus',
        () => renderDropdown(l3Input.value)
    );

    l3Input.addEventListener(
        'blur',
        () => setTimeout(() => {
            dropdown.style.display = 'none';
        }, 200)
    );

    l3Input.addEventListener('focus', () => {
        l3Input.style.boxShadow = `
        inset 0 0 0 2px #10b981,
        0 0 8px rgba(16,185,129,.30)
    `;
    });

    l3Input.addEventListener('blur', () => {
        l3Input.style.boxShadow = '';
    });


    // =====================================================
    // L3 INPUT WRAPPER
    // =====================================================

    const l3Wrapper = document.createElement('div');

    l3Wrapper.style.cssText = `
    position: relative;
    display: flex;
    align-items: center;
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

    l3Group.style.cssText =
        splitGroupStyle + `
        border: 1px solid #cbd5e1;
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

