import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapCanvas, type MapHandle } from "../components/MapCanvas";
import { BottomSheet, useSnapHeights, type Snap } from "../components/BottomSheet";
import { CategoryFilter } from "../components/CategoryFilter";
import { AttractionDetail } from "../components/AttractionDetail";
import { PlanList } from "../components/PlanList";
import { MapThumb } from "../components/MapThumb";
import { Toast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { ATTRACTIONS, BY_ID, handoffUrl, parseIdList, phoneOrigin } from "../data";
import { CATEGORIES, matchesFilter } from "../data/categories";
import { useVisit } from "../state/visit";

const TICKETS = "https://ticket.gardensbythebay.com.sg";

export default function MobileView() {
  const v = useVisit();
  const map = useRef<MapHandle>(null);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const heights = useSnapHeights();
  const [snap, setSnap] = useState<Snap>("peek");
  const [tab, setTab] = useState<"explore" | "plan">("explore");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const handled = useRef(false);

  // Deep link from the kiosk QR: /m?a=<id>&plan=<id,id>
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const plan = parseIdList(params.get("plan"));
    const a = params.get("a");
    const valid = a && BY_ID.has(a) ? a : null;
    if (!plan.length && !valid) return;
    if (plan.length) v.mergePlan(plan);
    if (valid) {
      v.select(valid);
      setSnap("half");
      setTimeout(() => map.current?.focus(valid, { occludeBottom: heights.half, zoom: 1.6 }), 400);
    } else {
      setTab("plan");
      setSnap("half");
    }
    setToast(plan.length ? "Welcome! Your plan from the kiosk is here 🌿" : `Here's ${BY_ID.get(valid!)!.name} 🌿`);
    navigate("/m", { replace: true });
  }, [params, navigate, v, heights.half]);

  const openPlace = useCallback(
    (id: string) => {
      v.select(id);
      setTab("explore");
      const target: Snap = snap === "full" ? "full" : "half";
      setSnap(target);
      map.current?.focus(id, { occludeBottom: heights[target === "full" ? "half" : target], zoom: 1.6 });
    },
    [v, snap, heights],
  );

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ATTRACTIONS.filter((a) => matchesFilter(a, v.filter)).filter(
      (a) => !s || a.name.toLowerCase().includes(s) || a.tagline.toLowerCase().includes(s) || (a.group?.toLowerCase().includes(s) ?? false) || CATEGORIES[a.category].label.toLowerCase().includes(s),
    );
  }, [q, v.filter]);

  const selected = v.selectedId ? BY_ID.get(v.selectedId) : undefined;

  const share = async () => {
    const url = handoffUrl(phoneOrigin(), null, v.plan);
    const text = `My Gardens by the Bay plan: ${v.plan.map((id) => BY_ID.get(id)?.name).join(" → ")}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Gardens by the Bay plan", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast("Link copied — paste it anywhere to share 📋");
    } catch {
      /* user cancelled share sheet */
    }
  };

  const header = (
    <div className="msheet__head">
      <div className="tabs tabs--mobile" role="tablist">
        <button role="tab" aria-selected={tab === "explore"} className={tab === "explore" ? "is-active" : ""} onClick={() => { setTab("explore"); if (snap === "peek") setSnap("half"); }}>
          <Icon name="search" size={17} /> Explore
        </button>
        <button role="tab" aria-selected={tab === "plan"} className={tab === "plan" ? "is-active" : ""} onClick={() => { setTab("plan"); if (snap === "peek") setSnap("half"); }}>
          <Icon name="route" size={17} /> My plan
          {v.plan.length > 0 && <span className="tab-badge">{v.plan.length}</span>}
        </button>
      </div>
      {tab === "explore" && !selected && (
        <>
          <label className="search">
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search domes, gardens, food…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSnap("full")}
              aria-label="Search places"
            />
            {q && (
              <button className="icon-btn icon-btn--sm" onClick={() => setQ("")} aria-label="Clear search">
                <Icon name="x" size={16} />
              </button>
            )}
          </label>
          <CategoryFilter value={v.filter} onChange={v.setFilter} className="chips--scroll" />
        </>
      )}
    </div>
  );

  return (
    <div className="mobile theme-auto">
      <MapCanvas
        ref={map}
        variant="mobile"
        fit="cover"
        selectedId={v.selectedId}
        planIds={v.plan}
        filter={v.filter}
        onSelect={openPlace}
        controlsOffsetBottom={heights[snap]}
        controls={snap !== "full"}
      />

      <header className="mtop">
        <span className="brand brand--pill">
          <img src="/icons/icon.svg" alt="" width={30} height={30} />
          <span>Gardens by the Bay</span>
        </span>
        <a className="btn btn--tickets" href={TICKETS} target="_blank" rel="noreferrer">
          <Icon name="ticket" size={17} /> Tickets
        </a>
      </header>

      <Toast message={toast} onDone={() => setToast(null)} />

      <BottomSheet snap={snap} onSnap={setSnap} header={header}>
        <AnimatePresence mode="wait" initial={false}>
          {tab === "plan" ? (
            <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlanList
                variant="mobile"
                plan={v.plan}
                visited={v.visited}
                onReorder={v.setPlan}
                onRemove={v.togglePlan}
                onClear={() => v.setPlan([])}
                onOpen={openPlace}
                onToggleVisited={v.toggleVisited}
                onShare={share}
              />
            </motion.div>
          ) : selected ? (
            <AttractionDetail
              key={selected.id}
              a={selected}
              variant="mobile"
              inPlan={v.plan.includes(selected.id)}
              onTogglePlan={() => v.togglePlan(selected.id)}
              onBack={() => v.select(null)}
            />
          ) : (
            <motion.ul key="list" className="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {results.map((a) => {
                const meta = CATEGORIES[a.category];
                const inPlan = v.plan.includes(a.id);
                return (
                  <li key={a.id} className="result" style={{ "--c": meta.color } as CSSProperties}>
                    <button className="result__main" onClick={() => openPlace(a.id)}>
                      <MapThumb a={a} zoom={5} ratio={1} marker={false} className="result__thumb" />
                      <span className="result__text">
                        <span className="result__name">{a.name}</span>
                        <span className="result__tag">{a.tagline}</span>
                        <span className="result__cat">
                          <i /> {meta.label}
                          {a.ticketed ? " · Ticketed" : ""}
                        </span>
                      </span>
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      className={`add ${inPlan ? "is-on" : ""}`}
                      onClick={() => v.togglePlan(a.id)}
                      aria-pressed={inPlan}
                      aria-label={inPlan ? `Remove ${a.name} from plan` : `Add ${a.name} to plan`}
                    >
                      <Icon name={inPlan ? "check" : "plus"} size={18} stroke={2.6} />
                    </motion.button>
                  </li>
                );
              })}
              {!results.length && <li className="results__empty">No places match “{q}”.</li>}
            </motion.ul>
          )}
        </AnimatePresence>
        <p className="credit">Map &amp; content © Gardens by the Bay. Concept entry for Stratagile AI Warm-up.</p>
      </BottomSheet>
    </div>
  );
}
