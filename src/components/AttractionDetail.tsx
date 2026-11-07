import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { Attraction } from "../types";
import { CATEGORIES } from "../data/categories";
import { formatMins } from "../data";
import { MapThumb } from "./MapThumb";
import { Icon } from "./Icon";

interface Props {
  a: Attraction;
  variant: "kiosk" | "mobile";
  inPlan: boolean;
  onTogglePlan(): void;
  onShowOnMap?(): void;
  onPrev?(): void;
  onNext?(): void;
  onBack?(): void;
}

export function AttractionDetail({ a, variant, inPlan, onTogglePlan, onShowOnMap, onPrev, onNext, onBack }: Props) {
  const meta = CATEGORIES[a.category];
  const showHoursFallback = !a.hours && a.category !== "facility" && a.category !== "transport";

  return (
    <motion.article
      key={a.id}
      className={`detail detail--${variant}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      aria-labelledby={`h-${a.id}`}
      onPanEnd={
        variant === "kiosk"
          ? (_, info) => {
              // Horizontal swipe moves to the next / previous place (spec §9).
              if (Math.abs(info.offset.x) < 80 || Math.abs(info.offset.x) < Math.abs(info.offset.y) * 1.5) return;
              if (info.offset.x < 0) onNext?.();
              else onPrev?.();
            }
          : undefined
      }
    >
      <div className="detail__hero">
        <MapThumb a={a} zoom={variant === "kiosk" ? 3.6 : 3.2} ratio={variant === "kiosk" ? 16 / 9 : 2} />
        <div className="detail__badges">
          <span className="badge" style={{ "--c": meta.color, "--ink": meta.ink } as CSSProperties}>
            <Icon name={meta.icon} size={14} stroke={2.4} />
            {meta.label}
          </span>
          <span className={`badge badge--plain ${a.ticketed ? "is-ticketed" : "is-free"}`}>
            <Icon name={a.ticketed ? "ticket" : "leaf"} size={14} stroke={2.2} />
            {a.ticketed ? "Ticketed" : "Free entry"}
          </span>
        </div>
        {onBack && (
          <button className="icon-btn detail__back" onClick={onBack} aria-label="Back to all places">
            <Icon name="left" />
          </button>
        )}
        <span className="detail__num" aria-hidden="true">
          {a.num.length <= 2 ? a.num : ""}
        </span>
      </div>

      <div className="detail__body">
        <h2 id={`h-${a.id}`} className="detail__name">
          {a.name}
        </h2>
        <p className="detail__tagline">{a.tagline}</p>
        {a.group && <p className="detail__group">Part of {a.group}</p>}

        <div className="detail__meta">
          {a.hours && (
            <span>
              <Icon name="clock" size={16} /> {a.hours}
            </span>
          )}
          {showHoursFallback && (
            <span>
              <Icon name="clock" size={16} /> Hours: see official site
            </span>
          )}
          {a.durationMins ? (
            <span>
              <Icon name="route" size={16} /> ~{formatMins(a.durationMins)}
            </span>
          ) : null}
        </div>

        <p className="detail__desc">{a.description}</p>

        {a.highlights && (
          <ul className="detail__hl">
            {a.highlights.map((h, i) => (
              <motion.li key={h} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.05 }}>
                <Icon name="leaf" size={15} stroke={2.2} />
                {h}
              </motion.li>
            ))}
          </ul>
        )}

        <div className="detail__actions">
          <motion.button whileTap={{ scale: 0.96 }} className={`btn ${inPlan ? "btn--done" : "btn--primary"}`} onClick={onTogglePlan} aria-pressed={inPlan}>
            <Icon name={inPlan ? "check" : "plus"} size={18} stroke={2.6} />
            {inPlan ? "In my plan" : "Add to my plan"}
          </motion.button>
          {variant === "kiosk" && onShowOnMap && (
            <button className="btn btn--ghost" onClick={onShowOnMap}>
              <Icon name="pin" size={18} />
              Show on map
            </button>
          )}
          {variant === "mobile" && (
            <a className="btn btn--ghost" href={a.officialUrl} target="_blank" rel="noreferrer">
              Official page <Icon name="external" size={16} />
            </a>
          )}
        </div>

        {variant === "kiosk" && (
          <div className="detail__nav">
            <button className="icon-btn" onClick={onPrev} aria-label="Previous place">
              <Icon name="left" />
            </button>
            <span className="detail__hint">
              <Icon name="phone" size={16} /> Swipe for more · scan below to take it with you
            </span>
            <button className="icon-btn" onClick={onNext} aria-label="Next place">
              <Icon name="right" />
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}
