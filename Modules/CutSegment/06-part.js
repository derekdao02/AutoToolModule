/* =====================================================================
 * SEGMENT CREATOR (New 60 s, Start/End, phím Q/W/Esc)
 * Khối độc lập – dùng biến riêng, không đụng tới code cũ
 * ===================================================================== */
    (() => {
        // Helpers riêng (đặt tên tránh trùng sleep/log/now của script gốc)
        const $$s = (s, r = document) => [...r.querySelectorAll(s)];
        const segSleep = ms => new Promise(r => setTimeout(r, ms));
        const segLog = (...a) => console.log("%c[TB-SEG]", "color:#22c55e;font-weight:bold", ...a);
        const getNew30 = () => $$s("button").find(b => /^New 30/.test(b.title || ""));
        const fiberOf = el => el && el[Object.keys(el).find(k => k.startsWith("__reactFiber$"))];
        const vids = () => $$s("video");
        const playhead = () => vids()[0]?.currentTime ?? 0;
        const parseT = s => typeof s === "number" ? s
            : String(s).trim().split(":").map(Number).reduce((a, v) => a * 60 + v, 0);
        const fmtT = t => {
            t = Math.round(t); const h = t / 3600 | 0, m = (t % 3600) / 60 | 0, s = t % 60;
            return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
        };
        const fmtFloor = t => fmtT(Math.floor(t));

        // ---------- 1. Runner mutation của app ----------
        function getRunner() {
            let r = fiberOf(getNew30()); while (r?.return) r = r.return;
            const st = [r];
            while (st.length) {
                const f = st.pop(); if (!f) continue;
                if ([0, 11, 15].includes(f.tag)) {
                    let h = f.memoizedState;
                    while (h && typeof h === "object" && "next" in h) {
                        const cb = Array.isArray(h.memoizedState) ? h.memoizedState[0] : null;
                        if (typeof cb === "function" && cb.toString().includes("Not an episode edit")) return cb;
                        h = h.next;
                    }
                }
                st.push(f.sibling, f.child);
            }
            return null;
        }
        function run(name, params, quiet = false) {
            const runner = getRunner();
            if (!runner) { segLog("⚠️ Không tìm thấy runner"); return null; }
            let res = null;
            try { res = runner(name, params); } catch (e) { if (!quiet) segLog("⚠️", name, e.message); return null; }
            if (!quiet) segLog(res ? "✅" : "⚠️ bị từ chối", name, params);
            return res;
        }

        // ---------- 2. Bỏ chọn segment (Esc) ----------
        async function deselect() {
            window.__tbSkipKey = true;
            try {
                document.activeElement?.blur?.();
                const ev = () => new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true });
                document.body.dispatchEvent(ev()); window.dispatchEvent(ev());
            } finally { window.__tbSkipKey = false; }
            await segSleep(150);
        }

        // ---------- 3. Chọn segment vừa tạo ----------
        async function selectNew(start, newKey) {
            const wants = new Set([fmtT(start), fmtFloor(start)]);
            const findRow = () => $$s('[data-testid^="episode-index-row-"]').find(r => {
                const m = r.innerText.match(/(\d+:)?\d+:\d{2}\s*$/);
                return m && wants.has(m[0].trim());
            });
            let row = null;
            for (let i = 0; i < 15 && !(row = findRow()); i++) await segSleep(100);
            if (row) {
                (row.querySelector("button,[role='button'],a") || row).click();
                await segSleep(300);
                segLog("👉 Đã chọn segment:", row.dataset.testid);
                return true;
            }
            if (newKey) {
                for (const p of [{ key: newKey }, { episodeKey: newKey }, { episodeId: newKey }, { id: newKey }]) {
                    if (run("ui.episode_bench.select", p, true)) { segLog("👉 Đã chọn qua mutation select", p); return true; }
                }
            }
            segLog("⚠️ Không chọn được segment mới", [...wants]);
            return false;
        }

        // ---------- 4. Seek ----------
        async function seekTo(t) {
            vids().forEach(v => (v.currentTime = t));
            await segSleep(200);
            segLog("⏩ Playhead →", fmtT(t));
        }

        // ---------- 5. Tạo segment ----------
        function tryCreate(s, e) {
            return run("ui.episode_bench.create", { startSeconds: s, endSeconds: e })
                ?? run("ui.episode_bench.create", { startSeconds: s, endSeconds: e, newKey: crypto.randomUUID() });
        }
        async function create(start, end) {
            start = parseT(start); end = parseT(end);
            if (!(end > start)) { segLog("⚠️ End phải > Start"); return null; }
            let res = tryCreate(start, end);
            if (!res) {
                segLog("Bị từ chối → bỏ chọn segment rồi thử lại");
                await deselect();
                res = tryCreate(start, end);
            }
            if (res) {
                await selectNew(start, res.newKey);
                await seekTo(end);
            }
            return res;
        }
        let markStart = null;
        const MIN_SEGMENT_SECONDS = 30;
        const TIME_EPSILON = 0.02;
        const BTN_CLASS =
            "relative flex h-7 items-center gap-1.5 rounded border px-2 " +
            "text-[11px] transition-colors duration-150";

        const ICON_Q = `
<svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
>
    <path d="M8 5v14"></path>
    <path d="M16 8l-4 4 4 4"></path>
</svg>`;

        const ICON_W = `
<svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
>
    <path d="M16 5v14"></path>
    <path d="M8 8l4 4-4 4"></path>
</svg>`;


        const KBD = k => `
<kbd
    class="rounded px-1 font-mono text-2xs"
    style="
        background:rgba(255,255,255,.12);
        color:inherit;
    "
>
    ${k}
</kbd>`;

        function fmtDuration(sec) {
            sec = Math.max(0, Number(sec) || 0);
            const total = Math.floor(sec);
            const h = Math.floor(total / 3600);
            const m = Math.floor((total % 3600) / 60);
            const s = total % 60;
            if (h > 0) {
                return (h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0"));
            }
            return (m + ":" + String(s).padStart(2, "0"));
        }

        function setActiveButton(button) {
            button.disabled = false;
            button.style.background = "#2563eb";
            button.style.borderColor = "#60a5fa";
            button.style.color = "#ffffff";

            button.style.boxShadow =
                "0 0 0 1px rgba(96,165,250,.20)," +
                "0 0 8px rgba(37,99,235,.30)";
            button.style.opacity = "1";
            button.style.cursor = "pointer";
        }

        function setMarkedButton(button) {
            button.disabled = true;
            button.style.background = "rgba(245,158,11,.18)";
            button.style.borderColor = "#f59e0b";
            button.style.color = "#fbbf24";
            button.style.boxShadow =
                "0 0 0 1px rgba(245,158,11,.18)," +
                "0 0 8px rgba(245,158,11,.20)";

            button.style.opacity = "1";
            button.style.cursor = "default";
        }

        function setDisabledButton(button) {
            button.disabled = true;
            button.style.background = "transparent";
            button.style.borderColor = "rgba(148,163,184,.25)";
            button.style.color = "#64748b";
            button.style.boxShadow = "none";
            button.style.opacity = "0.5";
            button.style.cursor = "default";
        }

        function updateQW() {
            const q = document.getElementById("tb-mark-q");
            const w = document.getElementById("tb-mark-w");

            if (!q || !w) {
                return;
            }

            if (markStart == null) {
                setActiveButton(q);
                setDisabledButton(w);

                q.innerHTML =
                    `${ICON_Q}` +
                    `<span>Start</span>` +
                    `${KBD("Q")}`;

                w.innerHTML =
                    `${ICON_W}` +
                    `<span>End</span>` +
                    `${KBD("W")}`;

                q.title = "Mark start — Q";
                w.title = "Nhấn Q để chọn Start trước";
                return;
            }

            const current = playhead();
            const duration = Math.abs(current - markStart);
            const canCreate = duration + TIME_EPSILON >= MIN_SEGMENT_SECONDS;

            setDisabledButton(q);
            q.innerHTML =
                `${ICON_Q}` +
                `<span>Start ${fmtT(markStart)}</span>` +
                `${KBD("Q")}`;

            q.title = `Start ${fmtT(markStart)} — Esc để huỷ`;

            if (!canCreate) {
                setMarkedButton(w);
                w.innerHTML =
                    `${ICON_W}` +
                    `<span>End ${fmtDuration(duration)}</span>` +
                    `${KBD("W")}`;

                w.title =
                    `Chưa đủ 30 giây — ` +
                    `${fmtDuration(duration)} / 0:30`;

                return;
            }

            setActiveButton(w);

            w.innerHTML =
                `${ICON_W}` +
                `<span>End ${fmtDuration(duration)}</span>` +
                `${KBD("W")}`;

            w.title = `Duration ${fmtDuration(duration)} — ` + `nhấn W để tạo segment`;
        }

        function markQ() {
            if (markStart != null) {
                segLog("Đã có Start — nhấn Esc để huỷ");
                return;
            }
            markStart = playhead();
            updateQW();
            segLog(`Start = ${fmtT(markStart)}`);
        }

        async function markW() {
            if (markStart == null) {
                segLog("Chưa có Start — nhấn Q trước");
                return;
            }

            let s = markStart;
            let en = playhead();

            if (en < s) {
                [s, en] = [en, s];
            }

            const duration = en - s;
            if (duration + TIME_EPSILON < MIN_SEGMENT_SECONDS) {
                segLog(`Chưa đủ 30s: ${fmtDuration(duration)}`);
                updateQW();
                return;
            }

            const oldStart = markStart;
            markStart = null;

            updateQW();

            const result = await create(s, en);
            if (!result) {
                console.warn("[TB-SEG] App từ chối tạo segment");
                markStart = oldStart;
                updateQW();
                return;
            }
            setTimeout(() => window.tbPan?.run?.(), 450);
        }

        function cancelMark() {
            markStart = null;
            updateQW();
            segLog("Đã huỷ Start");
        }

        // ---------- 7. UI: New 60 s + nút Q / W ----------
        function injectSegUI() {
            const benchTools = document.querySelector('[data-testid="bench-tools"]');

            if (!benchTools)
                return;

            const zoomGroup =
                [...benchTools.querySelectorAll(
                    'div[role="group"]'
                )].find(
                    el =>
                        el.getAttribute("aria-label") ===
                        "Zoom the timeline"
                );

            if (!zoomGroup)
                return;

            let w = document.getElementById("tb11-ui");
            if (w) {
                if (w.parentElement !== benchTools || w.nextElementSibling !== zoomGroup) {
                    benchTools.insertBefore(w, zoomGroup);
                }
                return;
            }

            w = document.createElement("div");
            w.id = "tb11-ui";
            w.style.cssText = "display:flex;" + "align-items:center;" + "gap:0;";

            w.className =
                "flex items-center " +
                "[&>button]:rounded-none " +
                "[&>button:first-of-type]:rounded-l " +
                "[&>button:last-of-type]:rounded-r " +
                "[&>button+button]:-ml-px";

            w.setAttribute("role", "group");
            w.setAttribute("aria-label", "Mark segment");

            const mk = (id, title, fn) => {
                const b = document.createElement("button");
                b.type = "button";
                b.id = id;
                b.title = title;
                b.className = BTN_CLASS;
                b.onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    b.blur();
                    fn();
                };
                return b;
            };

            w.append(
                mk("tb-mark-q", "Mark start — Q", markQ),
                mk("tb-mark-w", "Mark end — W", markW)
            );

            benchTools.insertBefore(w, zoomGroup);
            updateQW();
        }
        window.__tbInjectSegUI = injectSegUI;
        injectSegUI();

        // -------------------------------------------------------
        // Update duration của W theo video
        // Không dùng setInterval
        // -------------------------------------------------------
        let durationVideo = null;

        function bindDurationVideo() {
            const video = document.querySelector("video");

            if (!video || video === durationVideo) {
                return;
            }

            if (durationVideo) {
                durationVideo.removeEventListener("timeupdate", updateQW);
                durationVideo.removeEventListener("seeked", updateQW);
            }

            durationVideo = video;
            video.addEventListener("timeupdate", updateQW, { passive: true });
            video.addEventListener("seeked", updateQW, { passive: true });
        }

        bindDurationVideo();

        // ---------- 8. Phím Q / W / Esc ----------
        const isTyping = e => {
            const el = e.target;
            return el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName) ||
                el?.closest?.('[role="combobox"],[role="textbox"],[contenteditable="true"]');
        };

        document.addEventListener("keydown", e => {
            if (window.__tbSkipKey) return;
            if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
            const k = e.key.toLowerCase();
            if (!["q", "w", "escape"].includes(k)) return;
            if (k === "escape" && markStart == null) return;
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            if (k === "q") markQ();
            else if (k === "w") markW();
            else cancelMark();
        }, true);

        window.tb = { run, create, deselect, selectNew, seekTo, getRunner };
        segLog("Segment Creator ready → Q = Start | W = End + tạo + chọn + playhead về cuối | Esc = huỷ");
    })();

    