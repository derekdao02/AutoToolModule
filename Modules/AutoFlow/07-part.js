/* =====================================================================
 * AUTO FOLLOW (playhead only) – playhead > 90% thì cuộn về 10%
 * Chỉ theo dõi vạch playhead: div[aria-hidden].bg-brand-blue.w-0.5
 * ===================================================================== */
    (() => {
        if (window.__tbFollowLoaded) return; window.__tbFollowLoaded = true;

        const TRIGGER = 90, TARGET = 10;   // %
        const PH_SEL = 'div[aria-hidden="true"].bg-brand-blue.w-0\\.5';
        const flog = (...a) => console.log("%c[TB-FOLLOW]", "color:#a855f7;font-weight:bold", ...a);

        let ph = null, disabled = false, busyUntil = 0, mouseDown = false;
        document.addEventListener("pointerdown", () => (mouseDown = true), true);
        document.addEventListener("pointerup", () => (mouseDown = false), true);

        const getPh = () => (ph?.isConnected ? ph : (ph = document.querySelector(PH_SEL)));

        function followCheck() {
            if (disabled || document.hidden || mouseDown || performance.now() < busyUntil) return;
            const v = document.querySelector("video");
            if (!v || v.paused) return;
            const el = getPh(); if (!el) return;

            const p = parseFloat(el.style.left);
            if (!(p >= TRIGGER && p <= 101)) return;

            const box = el.parentElement;
            const R = box.getBoundingClientRect();
            const px = (p - TARGET) / 100 * R.width;
            box.dispatchEvent(new WheelEvent("wheel", {
                bubbles: true, cancelable: true, deltaMode: 0, deltaX: px,
                clientX: R.left + R.width / 2, clientY: R.top + R.height / 2
            }));
            busyUntil = performance.now() + 800;
        }

        // Optimized: follow the player's own timeupdate event instead of polling every 250 ms.
        let followVideo = null;
        function bindFollowVideo() {
            const v = document.querySelector("video");
            if (!v || v === followVideo) return;
            followVideo?.removeEventListener("timeupdate", followCheck);
            followVideo = v;
            followVideo.addEventListener("timeupdate", followCheck, { passive: true });
        }
        bindFollowVideo();
        const followBindObserver = new MutationObserver(bindFollowVideo);
        followBindObserver.observe(document.body, { childList: true, subtree: true });

        window.tbFollow = {
            playhead: getPh,
            off: () => (disabled = true),
            on: () => (disabled = false)
        };
        flog("Auto follow ready – chỉ theo playhead");
    })();
