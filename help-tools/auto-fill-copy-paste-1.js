// ==================== CONFIG: AUTO-FILL ====================
const CONFIG = {
    panelId: 'tb-helper-panel',
    segmentSelector: '',
    copyRequiresAllFields: true,
    activitySeparator: '_',
    maxObjectWords: 2,
    minL3Score: 18,
    delayBetweenEpisodes: 50,

    selectors: {
        description: [
            'textarea[data-testid="label-task-description"]',
            'textarea[name*="description" i]',
            'textarea[id*="description" i]'
        ],
        activity: [
            'input[data-testid*="activity" i]',
            'input[name*="activity" i]',
            'input[id*="activity" i]',
            'input[placeholder*="activity" i]'
        ],
        skillGroup: [
            'input[data-testid*="skill" i]',
            'input[name*="skill" i]',
            'input[id*="skill" i]',
            'input[placeholder*="skill" i]'
        ],
        scene: [
            'input[data-testid*="scene" i]',
            'input[data-testid*="environment" i]',
            'input[name*="scene" i]',
            'input[id*="scene" i]',
            'input[placeholder*="scene" i]',
            'input[placeholder*="environment" i]'
        ]
    }
};

async function translateToEnglish(text) {
    if (!text) return text;

    const currentApiKey = typeof window.getStoredApiKey === 'function' ? window.getStoredApiKey() : GEMINI_API_KEY;
    if (currentApiKey) {
        for (const model of GEMINI_MODELS) {
            let delay = 2000;
            for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES_PER_MODEL; attempt++) {
                try {
                    const prompt = `${promptSystem}\n\n${promptRules}\n\n${promptInput(text)}`;

                    console.log(
                        `🤖 Model ${model} - attempt ${attempt}/${GEMINI_MAX_RETRIES_PER_MODEL}`
                    );

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': currentApiKey
                        },
                        body: JSON.stringify({
                            model: model,
                            input: prompt
                        })
                    });

                    if (response.status === 429 || response.status === 503 || response.status === 500) {
                        if (response.status === 429) {
                            const errText = await response.text().catch(() => "");
                            if (errText.toLowerCase().includes('quota') || errText.toLowerCase().includes('resource_exhausted')) {
                                alert('🚨 Đã HẾT TOKEN hoặc vượt quá quota của Gemini API Key! Vui lòng đổi Key khác tại nút 🔑 Key.');
                                throw new Error("Quota exceeded");
                            }
                        }
                        if (attempt === maxRetries) throw new Error(`API Error status: ${response.status}`);
                        console.warn(`⚠️ API quá tải (${response.status}). Thử lại lần ${attempt}/${maxRetries} sau ${delay / 1000}s...`);
                        await new Promise(r => setTimeout(r, delay));
                        delay *= 2;
                        continue;
                    }

                    if (!response.ok) {
                        const errorBody = await response.text();
                        console.error(
                            `Gemini API Error: ${response.status}`,
                            errorBody
                        );
                    } else {
                        const data = await response.json();
                        let rawText = null;

                        // 1. Kiểm tra cấu trúc Interactions / Steps mới của bạn
                        if (Array.isArray(data?.steps)) {
                            for (const step of data.steps) {
                                if (step.type === "model_output" && Array.isArray(step.content)) {
                                    const textItem = step.content.find(c => c.type === "text" && c.text);
                                    if (textItem) {
                                        rawText = textItem.text;
                                        break;
                                    }
                                }
                            }
                        }

                        // 2. Dự phòng thêm cấu trúc generateContent cũ (nếu có sau này)
                        if (!rawText && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                            rawText = data.candidates[0].content.parts[0].text;
                        }

                        // 3. Tiến hành làm sạch và Parse JSON an toàn
                        if (rawText && typeof rawText === 'string') {
                            try {
                                const cleanJsonStr = rawText
                                    .replace(/```json/gi, '')
                                    .replace(/```/g, '')
                                    .trim();

                                const parsedObj = JSON.parse(cleanJsonStr);

                                if (parsedObj && parsedObj.desc && parsedObj.act) {
                                    console.log(`🤖 [GEMINI JSON PARSED]:`, parsedObj);

                                    return {
                                        desc: parsedObj.desc.trim(),
                                        act: parsedObj.act.toLowerCase().trim(),
                                        skill: parsedObj.skill && parsedObj.skill.trim() !== "" ? parsedObj.skill.trim() : "Pick and Place / Object Handling",
                                        difficulty: ["Easy", "Medium", "Hard"].includes(parsedObj.difficulty) ? parsedObj.difficulty : "Easy"
                                    };
                                }
                            } catch (parseError) {
                                console.error("Lỗi cú pháp JSON từ Gemini trả về:", parseError, "Raw Text:", rawText);
                            }
                        }

                        console.warn("Gemini returned invalid JSON or empty output:", data);
                    }
                    break;
                } catch (e) {
                    console.error(
                        `❌ ${model} - attempt ${attempt}/${GEMINI_MAX_RETRIES_PER_MODEL}`,
                        e
                    );

                    if (attempt < GEMINI_MAX_RETRIES_PER_MODEL) {
                        await new Promise(r => setTimeout(r, delay));
                        delay *= 2;
                        continue;
                    }
                }
            }
            console.warn(
                `⚠️ ${model} lỗi đủ ${GEMINI_MAX_RETRIES_PER_MODEL} lần → chuyển model tiếp theo`
            );
        }
        throw new Error('ALL_GEMINI_MODELS_FAILED');
    }
}

async function translateBatchWithGemini(textsArray) {
    if (!Array.isArray(textsArray) || textsArray.length === 0) return [];

    const currentApiKey = typeof window.getStoredApiKey === 'function' ? window.getStoredApiKey() : GEMINI_API_KEY;

    if (currentApiKey) {
        for (const model of GEMINI_MODELS) {
            let delay = 2000;

            for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES_PER_MODEL; attempt++) {
                try {
                    const prompt = `${promptSystemBatch}\n\n${promptRules}\n\n${promptInputBatch(textsArray)}`;

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': currentApiKey
                        },
                        body: JSON.stringify({
                            model: model,
                            input: prompt
                        })
                    });

                    if (response.status === 429 || response.status === 503 || response.status === 500) {
                        if (response.status === 429) {
                            const errText = await response.text().catch(() => "");
                            if (errText.toLowerCase().includes('quota') || errText.toLowerCase().includes('resource_exhausted')) {
                                alert('🚨 Đã HẾT TOKEN hoặc vượt quá quota của Gemini API Key! Vui lòng đổi Key khác tại nút 🔑 Key.');
                                break;
                            }
                        }
                        if (attempt === maxRetries) break;
                        console.warn(`⚠️ Batch API quá tải. Thử lại lần ${attempt}/${maxRetries}...`);
                        await new Promise(r => setTimeout(r, delay));
                        delay *= 2;
                        continue;
                    }

                    if (response.ok) {
                        const data = await response.json();
                        let rawText = null;

                        if (Array.isArray(data?.steps)) {
                            for (const step of data.steps) {
                                if (step.type === "model_output" && Array.isArray(step.content)) {
                                    const textItem = step.content.find(c => c.type === "text" && c.text);
                                    if (textItem) {
                                        rawText = textItem.text;
                                        break;
                                    }
                                }
                            }
                        }

                        if (rawText) {
                            const cleanJsonStr = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                            const parsedArray = JSON.parse(cleanJsonStr);

                            if (Array.isArray(parsedArray)) {
                                console.log(`🤖 [GEMINI BATCH PARSED]:`, parsedArray);
                                return parsedArray.map(item => ({
                                    desc: item.desc ? item.desc.trim() : "",
                                    act: item.act ? item.act.toLowerCase().trim() : "object-action",
                                    skill: item.skill || "Pick and Place / Object Handling",
                                    difficulty: ["Easy", "Medium", "Hard"].includes(item.difficulty) ? item.difficulty : "Easy"
                                }));
                            }
                        }
                    }
                    break;
                } catch (e) {
                    console.error(`❌ Lỗi Batch API lần thử ${attempt}:`, e);
                    if (attempt === maxRetries) break;
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2;
                }
            }
            console.warn(`⚠️ Batch ${model} lỗi 3 lần → chuyển model tiếp theo`);
        }
        throw new Error('ALL_GEMINI_MODELS_FAILED');
    }
}

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[’']/g, '')
        .replace(/[-_/]/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findFirstElement(selectors, root = document) {
    for (const selector of selectors) {
        const el = root.querySelector(selector);
        if (el) return el;
    }
    return null;
}

function findInputNearLabel(labelTexts, root = document) {
    const candidates = Array.from(root.querySelectorAll('label, span, p, div'))
        .filter(el => el.children.length <= 2 && el.textContent.trim().length < 60);

    const label = candidates.find(el => {
        const t = normalizeText(el.textContent);
        return labelTexts.some(l => t === normalizeText(l) || t.startsWith(normalizeText(l)));
    });
    if (!label) return null;

    if (label.matches('label') && label.htmlFor) {
        const linked = document.getElementById(label.htmlFor);
        if (linked) return linked;
    }

    let node = label;
    for (let depth = 0; depth < 4 && node; depth++) {
        const input = node.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea');
        if (input) return input;
        node = node.parentElement;
    }
    return null;
}

const getDescriptionElement = (root = document) => findFirstElement(CONFIG.selectors.description, root) || findInputNearLabel(['task description', 'description'], root);
const getActivityElement = (root = document) => findFirstElement(CONFIG.selectors.activity, root) || findInputNearLabel(['activity'], root);
const getSkillGroupElement = (root = document) => findFirstElement(CONFIG.selectors.skillGroup, root) || findInputNearLabel(['skill group', 'skill'], root);
const getSceneElement = (root = document) => findFirstElement(CONFIG.selectors.scene, root) || findInputNearLabel(['scene environment l3', 'environment l3', 'scene', 'l3'], root);

function setNativeValue(element, value) {
    if (!element) return false;
    const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(element, value); else element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}

function clickOptionByText(targetText) {
    const target = normalizeText(targetText);
    const activeListboxes = Array.from(document.querySelectorAll('[role="listbox"], .dropdown-menu, .MuiAutocomplete-popper, [class*="dropdown"], [class*="menu"]'))
        .filter(el => el.offsetParent !== null);

    let candidates = [];
    if (activeListboxes.length > 0) {
        for (const box of activeListboxes) {
            const items = Array.from(box.querySelectorAll('button, [role="option"], [role="button"], li, div, span'))
                .filter(el => el.offsetParent !== null && normalizeText(el.textContent) === target);
            candidates = candidates.concat(items);
        }
    }

    if (candidates.length === 0) {
        candidates = Array.from(document.querySelectorAll('button, [role="option"], [role="button"], li, div, span'))
            .filter(el => el.offsetParent !== null && normalizeText(el.textContent) === target);
    }

    if (candidates.length === 0) return false;
    candidates[0].click();
    return true;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function setComboBoxValue(element, value) {
    if (!element || !value) return false;

    // 1. Focus và kích hoạt mở combobox
    element.focus();
    element.click();
    await sleep(100);

    // 2. Gán giá trị thông qua React Native Value Setter (nếu có)
    const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(element, value);
    else element.value = value;

    // 3. Bắn các sự kiện bàn phím và input để React state bắt được thay đổi
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(350);

    // 4. Thử tìm và click vào option khớp với giá trị trong dropdown nếu có
    if (clickOptionByText(value)) {
        await sleep(100);
        element.blur();
        return true;
    }

    // 5. Nếu không có option khớp, gửi phím Enter để xác nhận giá trị custom
    ['keydown', 'keypress', 'keyup'].forEach(type => {
        element.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    });

    await sleep(150);
    element.blur();

    // 6. Kiểm tra lại lần cuối, nếu bị React reset thì cưỡng bức gán lại giá trị setter
    if (element.value !== value) {
        if (setter) setter.call(element, value);
        else element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return true;
}

const CLIPBOARD_KEY = 'tbHelperSegmentClipboard';
function storageGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { } }

let segmentClipboard = storageGet(CLIPBOARD_KEY);
const DIFFICULTY_NAMES = ['Easy', 'Medium', 'Hard'];

function readDifficulty(root) {
    const isVisible = el => el.offsetParent !== null || el.getClientRects().length > 0;
    const isSelectedEl = el => {
        if (['aria-checked', 'aria-pressed', 'aria-selected', 'aria-current'].some(a => el.getAttribute(a) === 'true')) return true;
        const state = el.getAttribute('data-state');
        if (state && /^(checked|on|active|selected)$/i.test(state)) return true;
        const cls = (el.className && el.className.toString()) || '';
        if (/(^|[\s_-])(selected|active|checked)([\s_-]|$)/i.test(cls)) return true;
        const input = el.matches('input') ? el : el.querySelector('input[type="radio"], input[type="checkbox"]');
        return !!(input && input.checked);
    };
    const candidates = Array.from(root.querySelectorAll('button, [role="button"], [role="radio"], [role="option"], [role="tab"], label, li')).filter(isVisible);
    const hit = candidates.find(el => DIFFICULTY_NAMES.some(n => normalizeText(n) === normalizeText(el.textContent)) && isSelectedEl(el));
    if (hit) return DIFFICULTY_NAMES.find(n => normalizeText(n) === normalizeText(hit.textContent));
    return '';
}

function getCurrentSegmentRoot() {
    const descEl = getDescriptionElement();
    if (!descEl) return document.body;
    let node = descEl;
    while (node && node !== document.body) {
        if (node.querySelectorAll('[data-testid^="episode-index-row-"]').length > 0 || node.classList.contains('segment') || node.tagName === 'FORM') {
            return node;
        }
        node = node.parentElement;
    }
    return document.body;
}

function readCurrentSegmentData() {
    const root = getCurrentSegmentRoot();
    const val = el => (el && 'value' in el ? String(el.value).trim() : '');
    return {
        description: val(getDescriptionElement(root)),
        activity: val(getActivityElement(root)),
        skillGroup: val(getSkillGroupElement(root)),
        difficulty: readDifficulty(root),
        l3: val(getSceneElement(root))
    };
}

let isLoopRunning = false;
let isL3LoopRunning = false;

async function analyze(description) {
    // 1. Gọi hàm translateToEnglish để lấy về object gồm 4 trường do Gemini phân tích
    const result = await translateToEnglish(description);

    // Nếu vì lý do nào đó (lỗi mạng, hết quota) mà hàm trả về chuỗi thay vì object, ta có cơ chế phòng thủ:
    if (!result || typeof result !== 'object') {
        return {
            desc: description,
            act: "object-action",
            skill: { name: 'Pick and Place / Object Handling' },
            difficulty: { name: 'Easy' }
        };
    }

    // 2. Tách các biến ra từ kết quả trả về của Gemini
    const desc = result.desc;
    const act = result.act;

    // Định dạng lại thành object mà các hàm set giá trị form Tbrain đang cần
    const skill = { name: result.skill };
    const difficulty = { name: result.difficulty };

    // 3. Trả về đầy đủ để script tự động điền vào các ô input trên giao diện
    return { desc, act, skill, difficulty };
}

async function runAutoFill() {
    const currentBtnId = 'tb-inject-fill';
    setAllButtonsDisabled(true, currentBtnId);

    // Tìm nút Fill 1 trên giao diện (bạn có thể thay thế ID này nếu đặt khác)
    const fillSingleBtn = document.getElementById('tb-inject-fill') || document.querySelector('.tb-inject-fill-btn');

    if (fillSingleBtn) {
        fillSingleBtn.textContent = '⏳ Analyzing...';
        fillSingleBtn.style.backgroundColor = '#d97706'; // Màu cam báo đang xử lý
        fillSingleBtn.disabled = true;
    }

    try {
        const descEl = getDescriptionElement();
        if (!descEl || !descEl.value.trim()) {
            if (fillSingleBtn) resetFillBtn(fillSingleBtn);
            return false;
        }

        const rawText = descEl.value.trim();
        const result = await analyze(rawText);

        if (result.desc && result.desc !== rawText) {
            setNativeValue(descEl, result.desc);
        }

        const activityEl = getActivityElement();
        if (activityEl) setNativeValue(activityEl, result.act);

        const skillEl = getSkillGroupElement();
        // Xử lý linh hoạt đề phòng result.skill có thể là string hoặc object
        const skillName = typeof result.skill === 'object' ? result.skill.name : result.skill;
        if (skillEl) await setComboBoxValue(skillEl, skillName);
        else clickOptionByText(skillName);

        const diffName = typeof result.difficulty === 'object' ? result.difficulty.name : result.difficulty;
        clickOptionByText(diffName);

        // --- BỔ SUNG LOGIC KIỂM TRA L3 TẠI ĐÂY ---
        const inputEl = document.getElementById('tb-l3-custom-input');
        const customVal = inputEl ? inputEl.value.trim() : '';
        if (customVal) {
            const sceneEl = getSceneElement();
            if (sceneEl) await setComboBoxValue(sceneEl, customVal);
        }
        // ----------------------------------------

        segmentClipboard = readCurrentSegmentData();
        storageSet(CLIPBOARD_KEY, segmentClipboard);

        // Báo thành công tạm thời trên nút
        if (fillSingleBtn) {
            fillSingleBtn.textContent = '✅ Done!';
            fillSingleBtn.style.backgroundColor = '#10b981'; // Màu xanh lá thành công
        }

        setTimeout(() => {
            if (fillSingleBtn) resetFillBtn(fillSingleBtn);
        }, 1200);

        return true;
    } catch (err) {
        console.error("Lỗi khi chạy AutoFill:", err);
        if (fillSingleBtn) {
            fillSingleBtn.textContent = '❌ Error';
            fillSingleBtn.style.backgroundColor = '#dc2626'; // Màu đỏ báo lỗi
            setTimeout(() => resetFillBtn(fillSingleBtn), 1500);
        }
        return false;
    } finally {
        setAllButtonsDisabled(false, currentBtnId);
    }
}

// Hàm phụ trợ đưa nút về trạng thái bình thường
function resetFillBtn(btn) {
    btn.textContent = '⚡ Fill 1'; // Đổi lại tên nhãn nút ban đầu của bạn nếu khác
    btn.style.backgroundColor = '#2563eb'; // Màu xanh dương gốc của nút
    btn.disabled = false;
}

function runCopySegment() {
    segmentClipboard = readCurrentSegmentData();
    storageSet(CLIPBOARD_KEY, segmentClipboard);

    const btnCopy = document.getElementById('tb-inject-copy');
    if (btnCopy) {
        const originalText = btnCopy.innerHTML;
        btnCopy.innerHTML = '✅ Copied!';
        btnCopy.style.backgroundColor = '#059669';
        setTimeout(() => {
            btnCopy.innerHTML = originalText;
            btnCopy.style.backgroundColor = '#6366f1';
        }, 1000);
    }
    console.log('[TBRAIN] Đã copy thông tin segment:', segmentClipboard);
}

async function runPasteSegment() {
    if (!segmentClipboard) { alert('Chưa có dữ liệu nào được lưu.'); return; }
    const root = getCurrentSegmentRoot();
    const data = segmentClipboard;
    try {
        if (data.description) { const el = getDescriptionElement(root); if (el) setNativeValue(el, data.description); }
        if (data.activity) { const el = getActivityElement(root); if (el) setNativeValue(el, data.activity); }
        if (data.skillGroup) { const el = getSkillGroupElement(root); if (el) await setComboBoxValue(el, data.skillGroup); }
        if (data.difficulty) { clickOptionByText(data.difficulty, root); }
        if (data.l3) { const el = getSceneElement(root); if (el) await setComboBoxValue(el, data.l3); }
    } catch (err) { console.error('Lỗi khi paste:', err); }
}

async function runFillSingleL3() {
    const currentBtnId = 'tb-inject-single-l3';
    setAllButtonsDisabled(true, currentBtnId);

    try {
        const inputEl = document.getElementById('tb-l3-custom-input');
        const customVal = inputEl ? inputEl.value.trim() : '';
        if (!customVal) { alert('Vui lòng nhập giá trị L3 vào ô text box trước!'); return; }
        const sceneEl = getSceneElement();
        console.log('sceneEl')
        console.log(sceneEl)
        console.log('customVal')
        console.log(customVal)
        if (sceneEl) await setComboBoxValue(sceneEl, customVal);
    } catch (err) {
        console.error("Lỗi khi chạy Fill L3:", err);
    } finally {
        setAllButtonsDisabled(false, currentBtnId);
    }
}

async function runLoopFillL3() {
    const currentBtnId = 'tb-inject-l3-loop';
    setAllButtonsDisabled(true, currentBtnId);

    try {
        if (isL3LoopRunning) { isL3LoopRunning = false; return; }
        const inputEl = document.getElementById('tb-l3-custom-input');
        const customVal = inputEl ? inputEl.value.trim() : '';
        if (!customVal) { alert('Vui lòng nhập giá trị L3 vào ô text box trước!'); return; }

        const episodeButtons = Array.from(document.querySelectorAll('[data-testid^="episode-index-row-"]'));
        if (!episodeButtons.length) { runFillSingleL3(); return; }

        isL3LoopRunning = true;
        document.querySelectorAll('.tb-inject-fill-l3-loop-btn').forEach(b => { b.textContent = '⏹ Stop Fill L3 All'; b.style.backgroundColor = '#dc2626'; });

        for (let idx = 0; idx < episodeButtons.length; idx++) {
            if (!isL3LoopRunning) break;
            const btn = episodeButtons[idx];
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            btn.click();
            await sleep(CONFIG.delayBetweenEpisodes);
            if (!isL3LoopRunning) break;
            const sceneEl = getSceneElement();
            if (sceneEl) await setComboBoxValue(sceneEl, customVal);
            await sleep(300);
        }
    } catch (err) {
        console.error("Lỗi khi chạy Fill L3 All:", err);
    } finally {
        isL3LoopRunning = false;
        document.querySelectorAll('.tb-inject-fill-l3-loop-btn').forEach(b => { b.textContent = '🔄 Fill L3 All'; b.style.backgroundColor = '#059669'; });
        setAllButtonsDisabled(false, currentBtnId);
    }
}

async function runLoopAllEpisodes() {
    const currentBtnId = 'tb-inject-loop';
    setAllButtonsDisabled(true, currentBtnId);

    try {
        if (isLoopRunning) { isLoopRunning = false; return; }

        const episodeButtons = Array.from(document.querySelectorAll('[data-testid^="episode-index-row-"]'));
        if (!episodeButtons.length) { alert('Không tìm thấy danh sách episode.'); return; }

        isLoopRunning = true;

        // --- 1. HIỆN TRẠNG THÁI LOADING TRÊN NÚT ---
        const loopButtons = document.querySelectorAll('.tb-inject-loop-btn');
        loopButtons.forEach(b => {
            b.textContent = '⏳ Collecting...';
            b.style.backgroundColor = '#d97706'; // Màu cam báo đang chạy
            b.disabled = true;
        });

        document.querySelectorAll('.tb-inject-loop-btn').forEach(b => {
            b.textContent = '⏹ Stop';
            b.style.backgroundColor = '#dc2626';
        });

        const descriptionsToProcess = [];
        const validButtons = [];

        // 1. Duyệt qua tất cả các episode để thu thập mô tả (description)
        for (let idx = 0; idx < episodeButtons.length; idx++) {
            if (!isLoopRunning) break;
            const btn = episodeButtons[idx];
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            btn.click();
            await sleep(CONFIG.delayBetweenEpisodes);

            const descEl = getDescriptionElement();
            const textVal = descEl ? descEl.value.trim() : "";

            if (textVal && textVal !== 'no description yet') {
                descriptionsToProcess.push(textVal);
                validButtons.push(btn);
            }
        }

        if (descriptionsToProcess.length === 0) {
            alert('Không tìm thấy mô tả nào hợp lệ để xử lý.');
            isLoopRunning = false;
            document.querySelectorAll('.tb-inject-loop-btn').forEach(b => {
                b.textContent = '🔄 Fill All';
                b.style.backgroundColor = '#4338ca';
            });
            return;
        }

        // --- 2. BÁO ĐANG GỬI LÊN GEMINI XỬ LÝ BATCH ---
        loopButtons.forEach(b => {
            b.textContent = `🤖 AI Analyzing (${descriptionsToProcess.length})...`;
        });

        console.log(`📦 Đã gom được ${descriptionsToProcess.length} mô tả. Đang gửi lên Gemini batch...`);

        // 2. Gửi toàn bộ mảng mô tả lên Gemini một lần duy nhất
        const batchResults = await translateBatchWithGemini(descriptionsToProcess);

        // --- 3. BÁO ĐANG ĐIỀN DỮ LIỆU VÀO FORM ---
        loopButtons.forEach(b => {
            b.textContent = '✍️ Filling Data...';
        });

        // 3. Duyệt lại từng episode để điền kết quả tương ứng đã nhận từ mảng trả về
        for (let i = 0; i < validButtons.length; i++) {
            if (!isLoopRunning) break;
            const btn = validButtons[i];
            const res = batchResults[i];

            if (!res) continue;

            btn.click();
            await sleep(CONFIG.delayBetweenEpisodes);

            const root = getCurrentSegmentRoot();

            // Điền Description
            const descEl = getDescriptionElement(root);
            if (descEl && res.desc) setNativeValue(descEl, res.desc);

            // Điền Activity
            const activityEl = getActivityElement(root);
            if (activityEl && res.act) setNativeValue(activityEl, res.act);

            // Điền Skill Group
            const skillEl = getSkillGroupElement(root);
            if (skillEl) await setComboBoxValue(skillEl, res.skill);
            else clickOptionByText(res.skill);

            // Điền Difficulty
            if (res.difficulty) clickOptionByText(res.difficulty, root);

            // Kiểm tra L3 Custom nếu có
            const inputEl = document.getElementById('tb-l3-custom-input');
            const customVal = inputEl ? inputEl.value.trim() : '';
            if (customVal) {
                const sceneEl = getSceneElement(root);
                if (sceneEl) await setComboBoxValue(sceneEl, customVal);
            }

            await sleep(50);
        }

        // --- 4. HOÀN TẤT, TRẢ LẠI TRẠNG THÁI NÚT BAN ĐẦU ---
        resetLoopButtons();
    } catch (err) {
        console.error("Lỗi khi chạy Fill All:", err);
    } finally {
        setAllButtonsDisabled(false, currentBtnId);
    }
    console.log('✅ Đã hoàn tất Fill All theo dạng Batch Array!');
}

// Thêm hàm xử lý khi bấm nút Rework task
async function runReworkTask() {
    const btnRework = document.getElementById('tb-inject-rework');
    if (btnRework) {
        const originalText = btnRework.innerHTML;
        btnRework.innerHTML = '⏳ Processing...';
        btnRework.style.backgroundColor = '#d97706';

        // Thêm logic gọi API hoặc xử lý task fail tại đây theo ý bạn
        console.log('🔄 Đang thực hiện xử lý Rework task...');

        setTimeout(() => {
            btnRework.innerHTML = '✅ Done!';
            btnRework.style.backgroundColor = '#059669';
            setTimeout(() => {
                btnRework.innerHTML = originalText;
                btnRework.style.backgroundColor = '#f59e0b';
            }, 1500);
        }, 1000);
    }
}

// Hàm phụ trợ reset nút về trạng thái ban đầu
function resetLoopButtons() {
    isLoopRunning = false;
    document.querySelectorAll('.tb-inject-loop-btn').forEach(b => {
        b.textContent = '🔄 Fill All';
        b.style.backgroundColor = '#4338ca'; // Màu gốc
        b.disabled = false;
    });
}

