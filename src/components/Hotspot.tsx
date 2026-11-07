import { useRef, type CSSProperties } from "react";
import { CATEGORIES } from "../data/categories";
import type { Attraction } from "../types";
import { Icon } from "./Icon";

interface Props {
  a: Attraction;
  selected: boolean;
  inPlan: boolean;
  dim: boolean;
  alwaysLabel: boolean;
  onSelect(id: string): void;
}

/** One tappable map pin. Positioned in % of the map, counter-scaled so it keeps its on-screen size. */
export function Hotspot({ a, selected, inPlan, dim, alwaysLabel, onSelect }: Props) {
  const meta = CATEGORIES[a.category];
  const down = useRef<{ x: number; y: number } | null>(null);
  const cls = [
    "pin",
    meta.minor ? "pin--minor" : "pin--major",
    selected && "is-selected",
    inPlan && "in-plan",
    dim && "is-dim",
    alwaysLabel && "label-always",
    a.featured && "is-featured",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div role="listitem" className={`pin-wrap cat-${a.category}`} style={{ left: `${a.pos.x}%`, top: `${a.pos.y}%` }}>
      <button
        id={`pin-${a.id}`}
        className={cls}
        style={{ "--c": meta.color, "--ink": meta.ink } as CSSProperties}
        aria-label={`${a.name}, ${meta.label}${inPlan ? ", in your plan" : ""}`}
        aria-pressed={selected}
        tabIndex={dim ? -1 : 0}
        onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
        onClick={(e) => {
          // Ignore the click that ends a pan gesture.
          const d = down.current;
          if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 && e.detail > 0) return;
          e.stopPropagation();
          onSelect(a.id);
        }}
      >
        <span className="pin__dot">
          <span className="pin__icon">
            <Icon name={meta.icon} size={meta.minor ? 12 : 17} stroke={2.2} />
          </span>
        </span>
        {inPlan && (
          <span className="pin__badge" aria-hidden="true">
            <Icon name="check" size={10} stroke={3.2} />
          </span>
        )}
        <span className="pin__label">{a.name}</span>
      </button>
    </div>
  );
}
