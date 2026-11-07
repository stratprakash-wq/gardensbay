import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as RMouseEvent } from "react";
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { ATTRACTIONS, BY_ID } from "../data";
import { matchesFilter } from "../data/categories";
import { MAP_BG, MAP_FALLBACK, MAP_H, MAP_SRC, MAP_W } from "../data/map";
import type { Filter } from "../types";
import { Icon } from "./Icon";
import { Hotspot } from "./Hotspot";

export interface FocusOptions {
  /** Zoom relative to the base fit (1 = fitted). Capped at the image's native resolution. */
  zoom?: number;
  /** Pixels hidden at the bottom of the map (e.g. a bottom sheet). */
  occludeBottom?: number;
  time?: number;
}

export interface MapHandle {
  focus(id: string, opts?: FocusOptions): void;
  reset(time?: number): void;
  zoomBy(factor: number): void;
}

interface Props {
  variant: "kiosk" | "mobile";
  fit: "contain" | "cover";
  selectedId: string | null;
  planIds: string[];
  filter: Filter;
  onSelect(id: string): void;
  /** Always show labels for a few well-spaced landmarks (kiosk). */
  featuredLabels?: boolean;
  controls?: boolean;
  controlsOffsetBottom?: number;
  interactive?: boolean;
}

/** Landmarks far enough apart to keep a permanent label on the kiosk overview. */
const ALWAYS_LABEL = new Set(["flower-dome", "cloud-forest", "supertree-grove", "floral-fantasy", "planet", "childrens-garden", "satay-by-the-bay"]);

/** Zoom range relative to the fitted overview (spec §8: 1× to 4×). */
const MAX_ZOOM = 4;
/** Labels for every visible hotspot appear past this zoom (spec §8). */
const LABEL_ZOOM = 1.8;
/** Camera move when an attraction is selected (spec §8: ~600 ms, ease-out). */
const FOCUS_MS = 600;

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const DEBUG = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");

type Cam = { x: number; y: number; s: number };
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const MapCanvas = forwardRef<MapHandle, Props>(function MapCanvas(
  { variant, fit, selectedId, planIds, filter, onSelect, featuredLabels, controls = true, controlsOffsetBottom = 0, interactive = true },
  ref,
) {
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = stageRef.current!;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width && height) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scales = useMemo(() => {
    if (!size) return null;
    const contain = Math.min(size.w / MAP_W, size.h / MAP_H);
    const cover = Math.max(size.w / MAP_W, size.h / MAP_H);
    const base = fit === "cover" ? cover : contain;
    const max = base * MAX_ZOOM;
    return { contain, cover, base, max };
  }, [size, fit]);

  // Pins keep a constant on-screen size: counter-scale them via a CSS variable.
  const applyScale = useCallback(
    (scale: number) => {
      const el = contentRef.current;
      if (!el || !scales) return;
      el.style.setProperty("--inv", String(1 / scale));
      el.dataset.zoom = scale / scales.base >= LABEL_ZOOM ? "near" : "far";
    },
    [scales],
  );

  const home = useCallback((): Cam => {
    if (!size || !scales) return { x: 0, y: 0, s: 1 };
    const s = scales.base;
    return { x: (size.w - MAP_W * s) / 2, y: (size.h - MAP_H * s) / 2, s };
  }, [size, scales]);

  /** Keep the artwork filling the view: never pan past the map's edges. */
  const clampCam = useCallback(
    (c: Cam): Cam => {
      if (!size || !scales) return c;
      const s = Math.min(scales.max, Math.max(scales.contain, c.s));
      const axis = (v: number, view: number, content: number) =>
        content <= view ? (view - content) / 2 : Math.min(0, Math.max(view - content, v));
      return { s, x: axis(c.x, size.w, MAP_W * s), y: axis(c.y, size.h, MAP_H * s) };
    },
    [size, scales],
  );

  // ---------------------------------------------------------------------------
  // Camera controller. All programmatic motion goes through here so wheel,
  // buttons, double-click, focus and reset share one smooth, interruptible
  // animation (the library's own wheel zoom is additive and far too coarse).
  // ---------------------------------------------------------------------------
  const raf = useRef<number | null>(null);
  const wheelTarget = useRef<{ s: number; ax: number; ay: number; cx: number; cy: number } | null>(null);

  const cam = (): Cam => {
    const st = zoomRef.current?.state;
    return st ? { x: st.positionX, y: st.positionY, s: st.scale } : home();
  };
  const put = (c: Cam) => zoomRef.current?.setTransform(c.x, c.y, c.s, 0);

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    wheelTarget.current = null;
  }, []);

  /** Tween to a camera with an ease-in-out curve, zooming in log-space so it feels even. */
  const flyTo = useCallback(
    (target: Cam, ms = 650, ease: (t: number) => number = easeInOutCubic) => {
      stop();
      const to = clampCam(target);
      if (reducedMotion() || ms <= 0) {
        put(to);
        return;
      }
      const from = cam();
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        const e = ease(k);
        const s = Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * e);
        // Interpolate the view centre (not the corner) so the motion arcs naturally.
        const w = size?.w ?? 0;
        const h = size?.h ?? 0;
        const fcx = (w / 2 - from.x) / from.s;
        const fcy = (h / 2 - from.y) / from.s;
        const tcx = (w / 2 - to.x) / to.s;
        const tcy = (h / 2 - to.y) / to.s;
        const cx = fcx + (tcx - fcx) * e;
        const cy = fcy + (tcy - fcy) * e;
        put(clampCam({ s, x: w / 2 - cx * s, y: h / 2 - cy * s }));
        raf.current = k < 1 ? requestAnimationFrame(step) : null;
      };
      raf.current = requestAnimationFrame(step);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clampCam, stop, size],
  );

  /**
   * Zoom by `factor` keeping the screen point (ax, ay) fixed. Repeated calls
   * compound on the pending target, and the camera glides toward it.
   */
  const zoomAt = useCallback(
    (factor: number, ax: number, ay: number) => {
      if (!scales) return;
      const cur = cam();
      const pending = wheelTarget.current;
      const baseS = pending ? pending.s : cur.s;
      const s = Math.min(scales.max, Math.max(scales.contain, baseS * factor));
      // Content point under the anchor, measured from the *current* camera.
      const cx = (ax - cur.x) / cur.s;
      const cy = (ay - cur.y) / cur.s;
      wheelTarget.current = { s, ax, ay, cx, cy };
      if (raf.current && !pending) {
        cancelAnimationFrame(raf.current);
        raf.current = null;
      }
      if (reducedMotion()) {
        put(clampCam({ s, x: ax - cx * s, y: ay - cy * s }));
        wheelTarget.current = null;
        return;
      }
      if (raf.current) return;
      const step = () => {
        const t = wheelTarget.current;
        if (!t) return;
        const c = cam();
        const ls = Math.log(c.s) + (Math.log(t.s) - Math.log(c.s)) * 0.24;
        const ns = Math.abs(Math.log(t.s) - ls) < 0.002 ? t.s : Math.exp(ls);
        put(clampCam({ s: ns, x: t.ax - t.cx * ns, y: t.ay - t.cy * ns }));
        if (ns === t.s) {
          wheelTarget.current = null;
          raf.current = null;
        } else raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scales, clampCam],
  );

  // Native, non-passive wheel listener: mouse wheel & trackpad pinch zoom, trackpad two-finger scroll pans.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".map-controls")) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const ax = e.clientX - r.left;
      const ay = e.clientY - r.top;
      const px = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const dy = e.deltaY * px;
      const dx = e.deltaX * px;
      const looksLikeMouseWheel = e.deltaMode !== 0 || (dx === 0 && Math.abs(dy) >= 40 && Number.isInteger(dy));
      if (e.ctrlKey) {
        // Trackpad pinch (browsers report it as ctrl+wheel with small deltas).
        zoomAt(Math.exp(-dy * 0.012), ax, ay);
      } else if (looksLikeMouseWheel) {
        zoomAt(Math.exp(-Math.sign(dy) * Math.min(Math.abs(dy), 120) * 0.0024), ax, ay);
      } else {
        stop();
        const c = cam();
        put(clampCam({ s: c.s, x: c.x - dx, y: c.y - dy }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, zoomAt, stop, clampCam]);

  useEffect(() => stop, [stop]);

  const zoomCenter = useCallback(
    (factor: number) => {
      if (!size) return;
      stop();
      const c = cam();
      const ax = size.w / 2;
      const ay = size.h / 2;
      const s = c.s * factor;
      flyTo({ s, x: ax - ((ax - c.x) / c.s) * s, y: ay - ((ay - c.y) / c.s) * s }, 380);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size, stop, flyTo],
  );

  const pendingReset = useRef<{ time: number; at: number } | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      focus(id, opts = {}) {
        const a = BY_ID.get(id);
        if (!a || !size || !scales) return;
        const s = Math.min(scales.base * (opts.zoom ?? 1.9), scales.max);
        const px = (a.pos.x / 100) * MAP_W;
        const py = (a.pos.y / 100) * MAP_H;
        const visH = size.h - (opts.occludeBottom ?? 0);
        flyTo({ s, x: size.w / 2 - px * s, y: visH / 2 - py * s }, opts.time ?? FOCUS_MS, opts.time ? easeInOutCubic : easeOutCubic);
      },
      reset(time = 650) {
        // Remember the request so it is re-applied if the stage resizes right after.
        pendingReset.current = { time, at: Date.now() };
        flyTo(home(), time);
      },
      zoomBy(factor) {
        zoomCenter(factor);
      },
    }),
    [size, scales, home, flyTo, zoomCenter],
  );

  useEffect(() => {
    if (zoomRef.current) applyScale(zoomRef.current.state.scale);
  }, [applyScale]);

  useEffect(() => {
    const p = pendingReset.current;
    if (!p || Date.now() - p.at > 1500) return;
    pendingReset.current = null;
    const t = setTimeout(() => flyTo(home(), p.time), 60);
    return () => clearTimeout(t);
  }, [home, flyTo]);

  const planSet = useMemo(() => new Set(planIds), [planIds]);

  const onDebugClick = (e: RMouseEvent) => {
    if (!DEBUG) return;
    const r = contentRef.current!.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * 100).toFixed(2);
    const y = (((e.clientY - r.top) / r.height) * 100).toFixed(2);
    // eslint-disable-next-line no-console
    console.log(`pos: { "x": ${x}, "y": ${y} }`);
  };

  const onDoubleClick = (e: RMouseEvent) => {
    if (!interactive || (e.target as HTMLElement).closest(".pin, .map-controls")) return;
    const r = stageRef.current!.getBoundingClientRect();
    const c = cam();
    // Double-click zooms in; at full zoom it eases back out to the overview.
    if (scales && c.s >= scales.max * 0.98) flyTo(home(), 600);
    else zoomAt(1.8, e.clientX - r.left, e.clientY - r.top);
  };

  const h = home();

  return (
    <div ref={stageRef} className={`map-stage map-stage--${variant}`} style={{ background: MAP_BG }} onDoubleClick={onDoubleClick}>
      {size && scales && (
        <TransformWrapper
          ref={zoomRef}
          initialScale={h.s}
          initialPositionX={h.x}
          initialPositionY={h.y}
          minScale={scales.contain}
          maxScale={scales.max}
          limitToBounds
          centerZoomedOut
          disabled={!interactive}
          wheel={{ disabled: true }}
          doubleClick={{ disabled: true }}
          pinch={{ step: 3 }}
          panning={{ excluded: ["pin-label"], velocityDisabled: false }}
          velocityAnimation={{ sensitivityTouch: 1, sensitivityMouse: 1, animationTime: 420, inertia: 1 }}
          autoAlignment={{ animationTime: 260 }}
          onPanningStart={stop}
          onPinchStart={stop}
          onInit={(r) => applyScale(r.state.scale)}
          onTransform={(_, s) => applyScale(s.scale)}
        >
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: MAP_W, height: MAP_H }}>
            <div ref={contentRef} className="map-content" data-filter={filter} onClick={onDebugClick} style={{ width: MAP_W, height: MAP_H } as CSSProperties}>
              <picture>
                <source srcSet={MAP_SRC} type="image/webp" />
                <img
                  className="map-img"
                  src={MAP_FALLBACK}
                  width={MAP_W}
                  height={MAP_H}
                  alt="Illustrated map of Gardens by the Bay, Bay South"
                  draggable={false}
                  decoding="async"
                />
              </picture>
              <div className="pins" role="list" aria-label="Places on the map">
                {ATTRACTIONS.map((a) => (
                  <Hotspot
                    key={a.id}
                    a={a}
                    selected={a.id === selectedId}
                    inPlan={planSet.has(a.id)}
                    dim={!matchesFilter(a, filter)}
                    alwaysLabel={!!featuredLabels && ALWAYS_LABEL.has(a.id)}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          </TransformComponent>
        </TransformWrapper>
      )}
      {controls && (
        <div className="map-controls" style={{ bottom: 16 + controlsOffsetBottom }}>
          <button className="map-btn" aria-label="Zoom in" onClick={() => zoomCenter(1.6)}>
            <Icon name="plus" />
          </button>
          <button className="map-btn" aria-label="Zoom out" onClick={() => zoomCenter(1 / 1.6)}>
            <Icon name="minus" />
          </button>
          <button className="map-btn" aria-label="Reset view" onClick={() => flyTo(home(), 600)}>
            <Icon name="recenter" />
          </button>
        </div>
      )}
    </div>
  );
});
