import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Snap = "peek" | "half" | "full";

function useViewportHeight() {
  const [vh, setVh] = useState(() => window.innerHeight);
  useEffect(() => {
    const on = () => setVh(window.visualViewport?.height ?? window.innerHeight);
    on();
    window.addEventListener("resize", on);
    window.visualViewport?.addEventListener("resize", on);
    return () => {
      window.removeEventListener("resize", on);
      window.visualViewport?.removeEventListener("resize", on);
    };
  }, []);
  return vh;
}

export function useSnapHeights() {
  const vh = useViewportHeight();
  return useMemo(() => ({ peek: 172, half: Math.round(vh * 0.5), full: Math.round(vh * 0.9) }), [vh]);
}

const spring = { type: "spring" as const, stiffness: 420, damping: 40 };

/**
 * Draggable bottom sheet. Only the header area drags, so the body can scroll
 * normally at every snap point.
 */
export function BottomSheet({
  snap,
  onSnap,
  header,
  children,
}: {
  snap: Snap;
  onSnap(s: Snap): void;
  header: ReactNode;
  children: ReactNode;
}) {
  const heights = useSnapHeights();
  const h = useMotionValue(heights[snap]);
  const drag = useRef<{ y0: number; h0: number; moved: boolean; samples: { t: number; y: number }[] } | null>(null);

  useEffect(() => {
    const c = animate(h, heights[snap], spring);
    return () => c.stop();
  }, [snap, heights, h]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { y0: e.clientY, h0: h.get(), moved: false, samples: [{ t: performance.now(), y: e.clientY }] };

    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dy = ev.clientY - d.y0;
      if (!d.moved && Math.abs(dy) < 6) return;
      d.moved = true;
      const raw = d.h0 - dy;
      const min = heights.peek - 40;
      const max = heights.full + 24;
      h.set(Math.max(min, Math.min(max, raw)));
      d.samples.push({ t: performance.now(), y: ev.clientY });
      if (d.samples.length > 5) d.samples.shift();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = drag.current;
      drag.current = null;
      if (!d || !d.moved) return;
      const s = d.samples;
      const dt = s.length > 1 ? s[s.length - 1].t - s[0].t : 1;
      const v = s.length > 1 ? -(s[s.length - 1].y - s[0].y) / Math.max(dt, 1) : 0; // px/ms, + = upward
      const projected = h.get() + v * 180;
      const order: Snap[] = ["peek", "half", "full"];
      let best: Snap = "peek";
      for (const k of order) if (Math.abs(heights[k] - projected) < Math.abs(heights[best] - projected)) best = k;
      animate(h, heights[best], spring);
      if (best !== snap) onSnap(best);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <motion.section className={`sheet sheet--${snap}`} style={{ height: h }} aria-label="Places and plan">
      <div className="sheet__grab" onPointerDown={onPointerDown}>
        <button
          className="sheet__handle"
          aria-label={snap === "full" ? "Collapse panel" : "Expand panel"}
          onClick={() => onSnap(snap === "full" ? "peek" : snap === "peek" ? "half" : "full")}
        >
          <span />
        </button>
        {header}
      </div>
      <div className="sheet__body">{children}</div>
    </motion.section>
  );
}
