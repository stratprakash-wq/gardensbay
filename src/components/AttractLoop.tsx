import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { FEATURED } from "../data";
import { CATEGORIES } from "../data/categories";
import type { MapHandle } from "./MapCanvas";
import { Icon } from "./Icon";

const STOPS = FEATURED.slice(0, 7);
const STEP_MS = 5500;

/** Idle "screensaver": slowly tours the highlights until someone touches the screen. */
export function AttractLoop({ mapRef, onExit }: { mapRef: RefObject<MapHandle>; onExit(): void }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % STOPS.length), STEP_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Small delay on the first stop so the map has re-measured to full screen.
    const t = setTimeout(() => mapRef.current?.focus(STOPS[i].id, { zoom: 2.6, time: 2400, occludeBottom: 160 }), i === 0 ? 200 : 0);
    return () => clearTimeout(t);
  }, [i, mapRef]);

  const a = STOPS[i];
  const meta = CATEGORIES[a.category];

  return (
    <motion.div
      className="attract"
      role="button"
      tabIndex={0}
      aria-label="Touch anywhere to explore the map"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      onPointerDown={onExit}
      onKeyDown={onExit}
    >
      <div className="attract__top">
        <span className="brand brand--light">
          <img src="/icons/icon.svg" alt="" width={44} height={44} />
          <span>
            Gardens by the Bay
            <small>Interactive Garden Map</small>
          </span>
        </span>
      </div>

      <div className="attract__caption">
        <AnimatePresence mode="wait">
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="badge" style={{ "--c": meta.color, "--ink": meta.ink } as CSSProperties}>
              <Icon name={meta.icon} size={15} stroke={2.4} /> {meta.label}
            </span>
            <h2>{a.name}</h2>
            <p>{a.tagline}</p>
          </motion.div>
        </AnimatePresence>
        <div className="attract__dots" aria-hidden="true">
          {STOPS.map((s, n) => (
            <span key={s.id} className={n === i ? "is-on" : ""} />
          ))}
        </div>
      </div>

      <div className="attract__cta">
        <span className="attract__ring" />
        <span className="attract__ring attract__ring--2" />
        <span className="attract__cta-inner">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 11.5V5a1.5 1.5 0 0 1 3 0v5.5M12 10V8.5a1.5 1.5 0 0 1 3 0V11M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.9-2.5L4.4 15.3a1.5 1.5 0 0 1 2.4-1.8L9 15.5" />
          </svg>
          Touch anywhere to explore
        </span>
      </div>
    </motion.div>
  );
}
