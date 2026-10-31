    // ==================== QUẢN LÝ GEMINI API KEY BẰNG LOCALSTORAGE ====================
    function getStoredApiKey() {
        // Ưu tiên lấy key người dùng đã nhập trong UI, nếu không có thì lấy biến cứng mặc định
        const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
        return saved ? JSON.parse(saved) : (typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : "");
    }

    function saveStoredApiKey(key) {
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(key.trim()));
    }

    // ==================== HÀM GỌI API THỐNG KÊ THU NHẬP ====================
    async function updateMyEarnings() {
        const candidate = findToken() || findToken(true);
        if (!candidate) return;

        const earningsEl = document.getElementById('tb-earnings-display');
        if (!earningsEl) return;

        try {
            // Gọi đồng thời cả 2 API lấy stats và extra-hours
            const [statsRes, extraRes] = await Promise.all([
                origFetch.call(window, STATS_API_URL, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${candidate.token}`, Accept: "*/*" },
                    credentials: "include"
                }),
                origFetch.call(window, EXTRA_HOURS_API_URL, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${candidate.token}`, Accept: "*/*" },
                    credentials: "include"
                })
            ]);

            let totalSeconds = 0;

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                totalSeconds += Number(statsData.labelledSeconds) || 0;
            }

            if (extraRes.ok) {
                const extraData = await extraRes.json();
                if (Array.isArray(extraData)) {
                    // Cộng dồn seconds từ các mục bonus
                    extraData.forEach(item => {
                        totalSeconds += Number(item.seconds) || 0;
                    });
                }
            }

            // Chuyển tổng giây ra giờ và nhân với 50,000 VND
            const hours = totalSeconds / 3600;
            const totalMoney = hours * 50000;

            earningsEl.textContent = `💰 ${Math.round(totalMoney).toLocaleString('vi-VN')} đ`;
            earningsEl.title = `Tổng thời gian (Đã gồm bonus): ${hours.toFixed(2)}h (${totalSeconds.toFixed(0)} giây)`;
        } catch (err) {
            console.error("Lỗi cập nhật thu nhập và giờ bonus:", err);
        }
    }

    function calculateEarningsFromTimeline() {
        const timelineEl = document.querySelector('[data-testid="timeline-hours"]');
        if (!timelineEl) return 0;

        const text = timelineEl.textContent || '';
        // Lấy phần trước dấu "/" (Ví dụ: "3 h 31 min")
        const recordedPart = text.split('/')[0].trim();

        let totalMinutes = 0;

        // Biểu thức chính quy để bóc tách giờ và phút
        const hourMatch = recordedPart.match(/(\d+)\s*h/);
        const minMatch = recordedPart.match(/(\d+)\s*min/);

        if (hourMatch) {
            totalMinutes += parseInt(hourMatch[1], 10) * 60;
        }
        if (minMatch) {
            totalMinutes += parseInt(minMatch[1], 10);
        }

        // Nếu không khớp định dạng h/min, thử tìm dạng giây hoặc số khác nếu có
        if (!hourMatch && !minMatch) {
            // Fallback: đọc qua title nếu có (ví dụ: "Episodes 3:31:09 of 3:53:14 recorded")
            const titleText = timelineEl.getAttribute('title') || '';
            const timeMatch = titleText.match(/(\d+):(\d+):(\d+)/);
            if (timeMatch) {
                const h = parseInt(timeMatch[1], 10);
                const m = parseInt(timeMatch[2], 10);
                const s = parseInt(timeMatch[3], 10);
                totalMinutes = h * 60 + m + s / 60;
            }
        }

        // 50,000 đ / 1 tiếng = 50,000 / 60 đ / 1 phút
        const earnings = (totalMinutes / 60) * 50000;
        return Math.round(earnings);
    }

    // Tạo ô hiển thị số tiền kiếm được từ timeline hiện tại
    function injectTimelineEarningsDisplay() {
        // Tìm vị trí thích hợp để gắn ô tiền (ví dụ cạnh timeline-hours hoặc trong wrapper của bạn)
        const timelineEl = document.querySelector('[data-testid="timeline-hours"]');
        if (timelineEl && !document.getElementById('tb-timeline-earnings')) {
            const earningsBadge = document.createElement('span');
            earningsBadge.id = 'tb-timeline-earnings';
            earningsBadge.className = 'ml-2 px-2 py-0.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded';
            earningsBadge.textContent = '💰 0 đ';

            // Chèn ngay sau phần tử timeline-hours
            timelineEl.insertAdjacentElement('afterend', earningsBadge);
        }

        // Cập nhật giá trị tiền
        const earningsBadge = document.getElementById('tb-timeline-earnings');
        if (earningsBadge) {
            const money = calculateEarningsFromTimeline();
            earningsBadge.textContent = `💰 ${money.toLocaleString('vi-VN')} đ`;
        }
    }

    // Chạy định kỳ để cập nhật số tiền theo thời gian thực khi bạn làm việc trên task
    // Optimized: update only when timeline-hours actually changes.
    let tbTimelineHoursEl = null;
    let tbTimelineHoursObserver = null;
    function bindTimelineEarningsObserver() {
        const el = document.querySelector('[data-testid=\"timeline-hours\"]');
        if (!el || el === tbTimelineHoursEl) return;
        tbTimelineHoursObserver?.disconnect();
        tbTimelineHoursEl = el;
        injectTimelineEarningsDisplay();
        tbTimelineHoursObserver = new MutationObserver(() => injectTimelineEarningsDisplay());
        tbTimelineHoursObserver.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title'] });
    }

