    // ==================== CONFIG: GEMINI API ====================
    const GEMINI_API_KEY = "*********************"; // Thay API Key của bạn vào đây
    const TOKEN_STORAGE_KEY = 'tb_gemini_api_key_custom';

    const PROJECT_ID = "cfbe006a-9012-41bc-ba3c-afa8a3338139";

    let POLL_INTERVAL = 2000;
    let MIN_DURATION_SECONDS = 7200;

    const TOKEN_RETRY_INTERVAL = 60000;
    const API_BASE = "https://api.tbrain.ai";
    const API_URL = `${API_BASE}/api/v1/tasks/pool?projectId=${PROJECT_ID}&page=1&pageSize=20`;
    const STATS_API_URL = `${API_BASE}/api/v1/tasks/my-stats?projectId=${PROJECT_ID}`;
    const EXTRA_HOURS_API_URL = `${API_BASE}/api/v1/my/extra-hours?projectId=${PROJECT_ID}`;
    // Đường dẫn CDN chứa hơn 1000 data L3 của bạn
    const L3_CDN_URL = 'https://cdn.jsdelivr.net/gh/derekdao02/AutoTranslate@master/l3.json';
    let GLOBAL_L3_LIST = []; // Mảng chứa danh sách L3 sau khi tải về

    const CLICK_URL = "https://beacon.tbrain.ai";
    const REQUEST_TIMEOUT = 5000;
    const AUTO_ACQUIRE = true;
    const PERF_LOG = true;

    const MIN_SAFE_POLL_INTERVAL = 2500;
    const RATE_LIMIT_FALLBACK_WAIT = 5000;
    const RATE_LIMIT_SAFETY_MS = 1000;

    let pressTimer = null;
    let isHolding = false;
    let isFastForwardActive = false;
    let previousRates = new Map();
    let lastActiveBtn = null; // Lưu nút tốc độ đang active trước khi tua 10x

    // 1. Khai báo các Key localStorage để lưu trạng thái
    const STORAGE_KEYS = {
        active: 'tb_fetch_active_state',
        poll: 'tb_poll_interval_val',
        duration: 'tb_min_duration_val',
        token: 'tb_gemini_api_key_custom'
    };

    const url = "https://generativelanguage.googleapis.com/v1beta/interactions";

    // Danh sách ID các nút cần quản lý trạng thái Disable/Enable khi click
    const CONTROL_BUTTON_IDS = [
        'tb-inject-fill',       // Nút Fill 1
        'tb-inject-loop',       // Nút Fill All
        'tb-inject-single-l3',  // Nút Fill L3
        'tb-inject-l3-loop'     // Nút Fill L3 All
    ];

    // L3 data lazy load
    async function loadL3Data() {
        try {
            const res = await fetch(L3_CDN_URL);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    // Hỗ trợ cả định dạng mảng object [{"name": "Kitchen"}, ...] hoặc mảng string ["Kitchen", ...]
                    GLOBAL_L3_LIST = data.map(item => typeof item === 'string' ? item : item.name).filter(Boolean);
                    console.log(`✅ Đã tải thành công ${GLOBAL_L3_LIST.length} mục L3 từ CDN!`);
                }
            }
        } catch (err) {
            console.error("❌ Không thể tải danh sách L3 từ CDN:", err);
        }
    }
    loadL3Data();

    // end L3 data lazy load

    // 10x
    // 1. Hàm inject nút 10x vào DOM nếu chưa có
    function inject10xButton() {
        const ratesContainer = document.querySelector('[data-testid="transport-rates"]');
        if (ratesContainer && !document.getElementById('tb-transport-rate-10')) {
            const btn10x = document.createElement('button');
            btn10x.id = 'tb-transport-rate-10';
            btn10x.type = 'button';
            btn10x.disabled = true; // Mặc định disable
            btn10x.className = 'flex h-9 items-center justify-center rounded border border-tb-border text-fg-2 hover:bg-hover opacity-40 w-auto px-2 font-mono text-xs transition-all';
            btn10x.title = 'Hold Ctrl+Shift (>500ms) — play at 10x';
            btn10x.setAttribute('data-testid', 'transport-rate-10');
            btn10x.setAttribute('aria-pressed', 'false');
            btn10x.textContent = '10x';

            ratesContainer.appendChild(btn10x);
        }
    }

    // 2. Kích hoạt chế độ 10x trên UI và Video
    function activate10x() {
        const btn10x = document.getElementById('tb-transport-rate-10');
        const ratesContainer = document.querySelector('[data-testid="transport-rates"]');

        if (ratesContainer) {
            // Tìm và lưu nút đang active hiện tại (có aria-pressed="true")
            lastActiveBtn = ratesContainer.querySelector('[aria-pressed="true"]');
            if (lastActiveBtn) {
                lastActiveBtn.setAttribute('aria-pressed', 'false');
                lastActiveBtn.className = 'flex h-9 items-center justify-center rounded border border-tb-border text-fg-2 hover:bg-hover disabled:opacity-40 w-auto px-2 font-mono text-xs';
            }
        }

        // Highlight sáng nút 10x
        if (btn10x) {
            btn10x.disabled = false;
            btn10x.setAttribute('aria-pressed', 'true');
            btn10x.className = 'flex h-9 items-center justify-center rounded border hover:bg-hover w-auto px-2 font-mono text-xs border-brand-blue bg-brand-blue/15 font-semibold text-fg underline underline-offset-2 opacity-100';
        }

        // Tăng tốc độ toàn bộ video lên 10x
        document.querySelectorAll('video').forEach(v => {
            // Lưu lại tốc độ hiện tại trước khi tua nhanh
            if (!previousRates.has(v)) {
                previousRates.set(v, v.playbackRate);
            }
            v.playbackRate = 10;
            v.play().catch(err => console.log('Play error:', err.message));
        });
    }

    // 3. Tắt chế độ 10x, trả về tốc độ và nút UI cũ
    function deactivate10x() {
        const btn10x = document.getElementById('tb-transport-rate-10');

        // Reset nút 10x về dạng disable
        if (btn10x) {
            btn10x.disabled = true;
            btn10x.setAttribute('aria-pressed', 'false');
            btn10x.className = 'flex h-9 items-center justify-center rounded border border-tb-border text-fg-2 hover:bg-hover opacity-40 w-auto px-2 font-mono text-xs transition-all';
        }

        // Trả lại tốc độ cũ cho từng video từ Map previousRates
        document.querySelectorAll('video').forEach(v => {
            if (previousRates.has(v)) {
                v.playbackRate = previousRates.get(v);
                previousRates.delete(v);
            } else {
                v.playbackRate = 1; // Mặc định nếu không tìm thấy
            }
        });

        // Khôi phục nút cũ active trên UI nếu có
        if (lastActiveBtn) {
            lastActiveBtn.setAttribute('aria-pressed', 'true');
            lastActiveBtn.className = 'flex h-9 items-center justify-center rounded border hover:bg-hover disabled:opacity-40 w-auto px-2 font-mono text-xs border-brand-blue bg-brand-blue/15 font-semibold text-fg underline underline-offset-2';

            // Trigger click lại nút cũ để player giao diện web tự đồng bộ lại tốc độ gốc
            lastActiveBtn.click();
        }

        lastActiveBtn = null;
    }

    // 4. Lắng nghe phím Ctrl + Shift
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && !isHolding) {
            isHolding = true;

            pressTimer = setTimeout(() => {
                if (isHolding && !isFastForwardActive) {
                    isFastForwardActive = true;
                    activate10x();
                }
            }, 500); // Ngưỡng giữ 500ms
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Control' || e.key === 'Shift' || !e.ctrlKey || !e.shiftKey) {
            isHolding = false;
            clearTimeout(pressTimer);

            if (isFastForwardActive) {
                isFastForwardActive = false;
                deactivate10x();
            }
        }
    });

    // Phòng trường hợp chuyển tab hoặc mất focus
    window.addEventListener('blur', () => {
        if (isFastForwardActive) {
            isHolding = false;
            isFastForwardActive = false;
            clearTimeout(pressTimer);
            deactivate10x();
        }
    });

    // Liên tục kiểm tra để inject nút 10x khi giao diện video load
    // Optimized: UI injection is coordinated by the shared DOM observer below.
    // setInterval(inject10xButton, 500);
    // end 10x

    // Hàm khóa/mở khóa toàn bộ nút chức năng
    function setAllButtonsDisabled(isDisabled, activeBtnId = null) {
        CONTROL_BUTTON_IDS.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = isDisabled;
                if (isDisabled) {
                    btn.style.opacity = '0.6';
                    btn.style.cursor = 'not-allowed';
                } else {
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    if (id === activeBtnId && btn.dataset.origText) {
                        btn.innerHTML = btn.dataset.origText;
                        btn.style.backgroundColor = '';
                    }
                }
            }
        });
    }

    // 1. Task Definition & Output Format Definition
    const promptSystem = `Translate the Vietnamese action description into English and generate an activity slug.
    Return ONLY a valid JSON object with exactly four fields: `;

    // 1. Task Definition & Output Format Definition
    const promptSystemBatch = `Analyze the following list of Vietnamese action descriptions. 
                Return ONLY a valid JSON array containing an object for each input in the exact same order.
                Each object must have exactly four fields:`;

    // 2. Rules & Skill Group Guidelines & Examples
    const promptRules = `
    {
    "desc": "English action description",
    "act": "object-action1-action2",
    "skill": "Exact Skill Group Name",
    "difficulty": "Easy"
    }
    Rules:
    - desc: concise, natural English translation starting with a V-ing verb.
    - act: lowercase words separated by hyphens.
    - Start act with the main object.
    - Represent EVERY main action in the description.
    - Convert each action into its gerund form ending in "-ing".
    - If multiple actions are connected by "and" or "và", include ALL of them in their original order.
    - If the Description field includes an action such as “Khoác áo choàng” or similar, Only mention it in "description" and do not include that action in the Activity field.
    - Combine the object and all gerund actions into one slug.
    - Never convert gerunds to base verbs.
    - Do not include tools, methods, articles, or unnecessary prepositional phrases in act unless they are essential to identify the action.
    - Do not duplicate the same action.
    - skill: MUST be EXACTLY ONE of the following valid group names based on the nature of the work:
        1. "Pick and Place / Object Handling" (Simple moving, lifting, transferring objects without altering them)
        2. "Tool Use & Technical Manipulation" (Using tools, crafting, weaving, carving, drilling, shaping materials like baskets, wood, metal)
        3. "Food Preparation & Cooking" (Chopping, cooking, mixing ingredients, washing food)
        4. "Mechanical / Automotive Work" (Repairing vehicles, tires, engines)
        5. "Repair & Maintenance" (Fixing broken furniture, appliances, plumbing)
        6. "Assembly & Installation" (Putting components together, screwing, mounting furniture)
        7. "Construction & Building" (Bricklaying, plastering, pouring concrete, heavy building)
        8. "Cleaning & Sanitation" (Wiping surfaces, sweeping, mopping, washing)
        9. "Organization & Tidying" (Arranging items in drawers, sorting books, tidying)
        10. "Packing & Bagging" (Folding, Boxing, wrapping, sealing packages)
        11. "Clothing & Laundry" (Folding clothes, ironing, sewing, laundering)
        12. "Inventory & Stock Management" (Counting stock, shelving, labeling items)
        13. "Retail & Service Operations" (Cashier checkout, serving customers)
        14. "Human Interaction & Handoffs" (Handing items to someone, greeting)
        15. "Healthcare & Caregiving" (hair cut, hair shaving, wash hair, all action relate the hair, First aid, feeding patients, applying bandages)
        16. "Home Appliance Interaction" (Operating microwaves, washing machines)
        17. "Electronics & Diagnostics" (Soldering circuit boards, testing electronics)
        18. "Dish Handling" (Washing and stacking plates, cups, cutlery)
    - difficulty: must be strictly one of these three values: "Easy", "Medium", or "Hard". Follow these strict classification rules:
    * "Easy": Simple, repetitive, or single-step actions requiring minimal physical dexterity or cognitive load (e.g., basic lifting, moving an object, wiping a flat surface, simple folding, sorting items by color/shape).
    * "Medium": Actions requiring moderate precision, tool usage, multi-step coordination, hand-eye coordination, or craft/assembly work (e.g., weaving, cutting with scissors, grinding and painting, screw fastening, precise placement, measuring).
    * "Hard": Complex, highly intricate, multi-stage, or delicate tasks requiring high precision, specialized skills, heavy physical exertion, or careful handling to avoid errors (e.g., hair cut, hair shave soldering microchips, complex mechanical repairs, delicate surgical/caregiving procedures, intricate carpentry, precision welding).

    - Skill Group Selection Criteria:
      * Tool Use & Technical Manipulation: Adjusting, setting up, operating cardboard processing machinery (slotting machines, carton erecting machines, cutting position measurement).
      * Packing & Bagging: Folding/shaping cardboard corners, assembling boxes, packing finished boxes, attaching barcode labels in production.
      * Inventory & Stock Management: Counting sheets/boxes before loading or after finishing, inspecting quality/defects, checking stock.
      * Pick and Place / Object Handling: Lifting, moving, loading sheets, removing excess scraps, stacking cardboard.
      * Cleaning & Sanitation: Cleaning scraps from production area/machinery.
    - Reference Examples (QTQ):
      * "Folding cardboard corners and feeding them into a carton erecting machine" -> Skill: "Packing & Bagging", Difficulty: "Medium" / "Hard"
      * "Counting cardboard sheets before loading them into the machine" -> Skill: "Inventory & Stock Management", Difficulty: "Medium"
      * "Adjusting the slotting machine for cardboard production" -> Skill: "Tool Use & Technical Manipulation", Difficulty: "Medium"
      * "Attaching barcode labels to cardboard products" -> Skill: "Packing & Bagging", Difficulty: "Easy"

    - Skill Group Selection Criteria:
      * Dish Handling: Focus on handling bowls, plates, chopsticks, and dining utensils (setting tables, clearing dishes, carrying plates).
      * Retail & Service Operations: Taking food orders, serving customers at tables, processing payment, transaction services.
      * Human Interaction & Handoffs: Handing takeaway orders directly to customers.
    - Reference Examples (Urban Shanghai):
      * "Serving food to customers at a table" -> Skill: "Retail & Service Operations", Difficulty: "Easy"
      * "Taking food orders from customers" -> Skill: "Retail & Service Operations", Difficulty: "Medium"
      * "Setting the table with bowls and chopsticks" -> Skill: "Dish Handling", Difficulty: "Easy"
      * "Clearing used dishes from the table" -> Skill: "Dish Handling", Difficulty: "Easy"
      * "Carrying plates from the kitchen to the dining area" -> Skill: "Dish Handling", Difficulty: "Medium"
      * "Handing a takeaway order directly to a customer" -> Skill: "Human Interaction & Handoffs", Difficulty: "Easy"

    - Skill Group Selection Criteria:
      * Tool Use & Technical Manipulation: Manual or tool-assisted cutting, bending, shaping, and weaving bamboo/rattan strips.
      * Assembly & Installation: Gluing, attaching rims, joining components to assemble/finish rattan items.
      * Packing & Bagging: Packing finished bamboo items into bags/boxes.
      * Pick and Place / Object Handling: Moving, stacking, or placing bamboo items.
    - Reference Examples (Mây tre Vân Anh):
      * "Cutting and trimming bamboo strips with tools" -> Skill: "Tool Use & Technical Manipulation", Difficulty: "Medium"
      * "Weaving bamboo baskets by hand" -> Skill: "Tool Use & Technical Manipulation", Difficulty: "Hard"
      * "Shaping and trimming woven bamboo products" -> Skill: "Tool Use & Technical Manipulation", Difficulty: "Hard"
      * "Gluing bamboo strips into a circular frame" -> Skill: "Assembly & Installation", Difficulty: "Medium"
      * "Attaching a round rim to a woven basket" -> Skill: "Assembly & Installation", Difficulty: "Hard"

    - Skill Group Selection Criteria:
      * Mechanical / Automotive Work: Direct work on core operating systems (engine, gearbox, brakes, transmission, steering, suspension, wheels). Mandatory even if description uses "repairing".
      * Repair & Maintenance: Fixing/servicing auxiliary components or bodywork non-essential to core engine/drive mechanics (replacing damaged body panels, repairing seats).
      * Electronics & Diagnostics: Checking, testing, diagnosing electrical/electronic faults with tools/multimeters.
      * Cleaning & Sanitation: Washing motorcycles and cleaning components.
    - Reference Examples (Đức Hiệp):
      * "Repairing a motorcycle engine using tools" -> Skill: "Mechanical / Automotive Work", Difficulty: "Hard"
      * "Replacing motorcycle brake pads" -> Skill: "Mechanical / Automotive Work", Difficulty: "Medium"
      * "Replacing damaged motorcycle body panels" -> Skill: "Repair & Maintenance", Difficulty: "Medium"
      * "Checking a motorcycle battery using a multimeter" -> Skill: "Electronics & Diagnostics", Difficulty: "Medium"
      * "Diagnosing motorcycle electrical faults" -> Skill: "Electronics & Diagnostics", Difficulty: "Hard"

    - Skill Group Selection Criteria:
      * Clothing & Laundry: Measuring, cutting, measuring fabric, sewing/stitching (manual or machine), edge trimming, ironing.
      * Assembly & Installation: Stretching, wrapping, and fastening upholstery/fabric directly onto frames, seats, or cushions.
      * Tool Use & Technical Manipulation: Operating or adjusting specialized sewing machinery parameters.
      * Repair & Maintenance: Fixing broken sewing machines or fixing damaged garment defects.
    - Reference Examples:
      * "Sewing fabric pieces using a sewing machine" -> Skill: "Clothing & Laundry", Difficulty: "Medium"
      * "Sewing curved or complex fabric patterns" -> Skill: "Clothing & Laundry", Difficulty: "Hard"
      * "Sewing a car seat cover using a sewing machine" -> Skill: "Clothing & Laundry", Difficulty: "Hard"
      * "Stretching and fastening upholstery fabric onto a seat frame" -> Skill: "Assembly & Installation", Difficulty: "Hard"
      * "Repairing a damaged sewing machine" -> Skill: "Repair & Maintenance", Difficulty: "Hard"

    Examples:
    Input: "Nhúng tre vào nước"
    Output: {"desc":"Dipping bamboo in water","act":"bamboo-dipping","skill":"Pick and Place / Object Handling","difficulty":"Easy"}

    Input: "Chuẩn bị công cụ/tool"
    Output: {"desc":"Preparing tools","act":"tools-preparing","skill":"Pick and Place / Object Handling","difficulty":"Easy"}

    Input: "Cắt tóc và cạo tóc bằng kéo"
    Output: {"desc":"Cutting hair using tool","act":"hair-cutting-trimming","skill":"Healthcare & Caregiving","difficulty":"Hard"}

    Input: "Rửa và lau bàn"
    Output: {"desc":"Washing and wiping a table","act":"table-washing-wiping","skill":"Cleaning & Sanitation","difficulty":"Easy"}

    Input: "Mài thanh gỗ rồi sơn thanh gỗ"
    Output: {"desc":"Grinding and painting a wooden rod","act":"wooden-rod-grinding-painting","skill":"Tool Use & Technical Manipulation","difficulty":"Medium"}

    Input: "Wrapping a strand around the edge of a plate"
    Output: {"desc":"Wrapping a strand around the edge of a plate","act":"plate-strand-wrapping","skill":"Pick and Place / Object Handling","difficulty":"Easy"}`;

    // 3. Final Constraints & Input Payload
    const promptInput = (text) => `- Return valid JSON only. Do not use Markdown fences or add explanations. Vietnamese action description: "${text}"`
    const promptInputBatch = (textsArray) => `- Return valid JSON array only. Do not use Markdown fences or add explanations.
        Input list of Vietnamese descriptions:
        ${JSON.stringify(textsArray)}`;

