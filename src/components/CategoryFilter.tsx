import type { CSSProperties } from "react";
import { FILTERS, matchesFilter } from "../data/categories";
import { ATTRACTIONS } from "../data";
import type { Filter } from "../types";

const COUNTS = Object.fromEntries(FILTERS.map((f) => [f.id, ATTRACTIONS.filter((a) => matchesFilter(a, f.id)).length]));

export function CategoryFilter({ value, onChange, className = "" }: { value: Filter; onChange(f: Filter): void; className?: string }) {
  return (
    <div className={`chips ${className}`} role="radiogroup" aria-label="Filter places by category">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          role="radio"
          aria-checked={value === f.id}
          className={`chip ${value === f.id ? "is-active" : ""}`}
          style={{ "--c": f.color } as CSSProperties}
          onClick={() => onChange(f.id)}
        >
          {f.id !== "all" && <span className="chip__dot" />}
          {f.label}
          <span className="chip__count">{COUNTS[f.id]}</span>
        </button>
      ))}
    </div>
  );
}
