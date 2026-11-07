import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { MapCanvas, type MapHandle } from "../components/MapCanvas";
import { CategoryFilter } from "../components/CategoryFilter";
import { AttractionDetail } from "../components/AttractionDetail";
import { PlanList } from "../components/PlanList";
import { QrHandoff } from "../components/QrHandoff";
import { AttractLoop } from "../components/AttractLoop";
import { MapThumb } from "../components/MapThumb";
import { Icon } from "../components/Icon";
import { useIdleTimer } from "../components/IdleTimer";
import { ATTRACTIONS, BY_ID, FEATURED, handoffUrl, phoneOrigin } from "../data";
import { CATEGORIES, matchesFilter } from "../data/categories";
import { useVisit } from "../state/visit";

const params = new URLSearchParams(window.location.search);
/** Seconds without a touch before the "Still there?" prompt (override with ?idle=15 for demos). */
const IDLE_S = Math.max(5, Number(params.get("idle")) || 60);
const COUNTDOWN_S = 10;

function useClock() {
  const fmt = useMemo(() => new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" }), []);
  const [now, setNow] = useState(() => fmt.format(new Date()));
  useEffect(() => {
    const t = setInterval(() => setNow(fmt.format(new Date())), 10_000);
    return () => clearInterval(t);
  }, [fmt]);
  return now;
}

export default function KioskView() {
  const v = useVisit();
  const map = useRef<MapHandle>(null);
  const [tab, setTab] = useState<"explore" | "plan">("explore");
  const [attract, setAttract] = useState(true);
  const clock = useClock();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [v.selectedId, tab]);

  // Kiosk hardening: no page zoom, no long-press menu.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    document.body.classList.add("is-kiosk");
    return () => {
      meta?.setAttribute("content", prev);
      document.removeEventListener("contextmenu", block);
      document.body.classList.remove("is-kiosk");
    };
  }, []);

  const resetAll = useCallback(() => {
    v.reset();
    setTab("explore");
    setAttract(true);
  }, [v]);

  // Idle detection → countdown → reset into the attract loop.
  const [warn, clearWarn] = useIdleTimer({ enabled: !attract, idleS: IDLE_S, countdownS: COUNTDOWN_S, onReset: resetAll });

  const exitAttract = useCallback(() => {
    setAttract(false);
    map.current?.reset(900);
  }, []);

  const select = useCallback(
    (id: string) => {
      v.select(id);
      setTab("explore");
      map.current?.focus(id);
    },
    [v],
  );

  const list = useMemo(() => ATTRACTIONS.filter((a) => matchesFilter(a, v.filter)), [v.filter]);
  const step = (dir: 1 | -1) => {
    if (!list.length) return;
    const i = list.findIndex((a) => a.id === v.selectedId);
    const next = list[(i + dir + list.length) % list.length];
    select(next.id);
  };

  const selected = v.selectedId ? BY_ID.get(v.selectedId) : undefined;
  const url = handoffUrl(phoneOrigin(), v.selectedId, v.plan);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className={`kiosk ${attract ? "is-attract" : ""}`}>
      <header className="kiosk__bar">
        <button className="brand" onClick={() => { v.select(null); setTab("explore"); map.current?.reset(); }} aria-label="Home">
          <img src="/icons/icon.svg" alt="" width={42} height={42} />
          <span>
            Gardens by the Bay
            <small>Explore · Bay South</small>
          </span>
        </button>
        <CategoryFilter value={v.filter} onChange={v.setFilter} />
        <div className="kiosk__right">
          <span className="kiosk__clock" aria-label="Singapore time">
            <Icon name="clock" size={18} /> {clock}
          </span>
          <button className="icon-btn icon-btn--dark" onClick={toggleFullscreen} aria-label="Toggle full screen">
            <Icon name="expand" />
          </button>
        </div>
      </header>

      <main className="kiosk__main">
        <div className="kiosk__map">
          <MapCanvas
            ref={map}
            variant="kiosk"
            fit="contain"
            selectedId={v.selectedId}
            planIds={v.plan}
            filter={v.filter}
            onSelect={select}
            featuredLabels
          />
          <div className="map-legend" aria-hidden="true">
            {(["conservatory", "attraction", "garden", "lake", "dining", "facility", "transport"] as const).map((c) => (
              <span key={c} style={{ "--c": CATEGORIES[c].color } as CSSProperties}>
                <i /> {CATEGORIES[c].label}
              </span>
            ))}
          </div>
        </div>

        <aside className="kiosk__panel">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "explore"} className={tab === "explore" ? "is-active" : ""} onClick={() => setTab("explore")}>
              Explore
            </button>
            <button role="tab" aria-selected={tab === "plan"} className={tab === "plan" ? "is-active" : ""} onClick={() => setTab("plan")}>
              My plan
              <AnimatePresence>
                {v.plan.length > 0 && (
                  <motion.span key={v.plan.length} className="tab-badge" initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    {v.plan.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          <div className="kiosk__scroll" ref={scrollRef}>
            <AnimatePresence mode="wait">
              {tab === "plan" ? (
                <motion.div key="plan" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <PlanList
                    variant="kiosk"
                    plan={v.plan}
                    onReorder={v.setPlan}
                    onRemove={v.togglePlan}
                    onClear={() => v.setPlan([])}
                    onOpen={select}
                  />
                </motion.div>
              ) : selected ? (
                <AttractionDetail
                  key={selected.id}
                  a={selected}
                  variant="kiosk"
                  inPlan={v.plan.includes(selected.id)}
                  onTogglePlan={() => v.togglePlan(selected.id)}
                  onShowOnMap={() => map.current?.focus(selected.id, { zoom: 3 })}
                  onPrev={() => step(-1)}
                  onNext={() => step(1)}
                />
              ) : (
                <Welcome key="welcome" onPick={select} />
              )}
            </AnimatePresence>
          </div>

          <QrHandoff url={url} count={v.plan.length} selectedName={selected?.name} />
          <p className="credit">Map &amp; content © Gardens by the Bay. Concept entry for Stratagile AI Warm-up.</p>
        </aside>
      </main>

      <AnimatePresence>{attract && <AttractLoop mapRef={map} onExit={exitAttract} />}</AnimatePresence>

      <AnimatePresence>
        {warn !== null && !attract && (
          <motion.div className="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={clearWarn}>
            <motion.div className="idle__card" initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }}>
              <svg className="idle__ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="44" />
                <motion.circle cx="50" cy="50" r="44" initial={{ pathLength: 1 }} animate={{ pathLength: warn / COUNTDOWN_S }} transition={{ duration: 0.3 }} />
              </svg>
              <span className="idle__num">{warn}</span>
              <h2>Still exploring?</h2>
              <p>Touch anywhere to keep going. We'll clear this screen for the next visitor soon.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Welcome({ onPick }: { onPick(id: string): void }) {
  return (
    <motion.div className="welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <p className="eyebrow">Welcome to Bay South</p>
      <h1>
        Where would you like <em>to wander</em> today?
      </h1>
      <p className="welcome__lead">Tap any pin on the map, or start with a favourite below. Build a plan and take it with you on your phone.</p>
      <div className="welcome__grid">
        {FEATURED.slice(0, 6).map((a, i) => (
          <motion.button
            key={a.id}
            className="tile"
            onClick={() => onPick(a.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            whileTap={{ scale: 0.97 }}
          >
            <MapThumb a={a} zoom={4} ratio={4 / 3} />
            <span className="tile__name">{a.name}</span>
            <span className="tile__sub" style={{ "--c": CATEGORIES[a.category].color } as CSSProperties}>
              <i /> {CATEGORIES[a.category].label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
