import type { CSSProperties, ReactNode } from "react";
import type { Attraction } from "../types";
import { MAP_ASPECT, MAP_SRC } from "../data/map";
import { CATEGORIES } from "../data/categories";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * A crop of the illustrated map centred on an attraction — every card gets a
 * "photo" drawn in the same style as the map itself.
 */
export function MapThumb({
  a,
  zoom = 3.4,
  ratio = 16 / 10,
  className = "",
  marker = true,
  children,
}: {
  a: Attraction;
  zoom?: number;
  ratio?: number;
  className?: string;
  marker?: boolean;
  children?: ReactNode;
}) {
  const fx = a.pos.x / 100;
  const fy = a.pos.y / 100;
  const zx = zoom;
  const zy = (zoom * ratio) / MAP_ASPECT;
  const px = clamp01((fx * zx - 0.5) / (zx - 1));
  const py = clamp01((fy * zy - 0.5) / (zy - 1));
  // Where the attraction lands inside the crop once edges are clamped.
  const mx = px * (1 - zx) + fx * zx;
  const my = py * (1 - zy) + fy * zy;
  const meta = CATEGORIES[a.category];

  return (
    <div
      className={`thumb ${className}`}
      style={
        {
          aspectRatio: String(ratio),
          backgroundImage: `url(${MAP_SRC})`,
          backgroundSize: `${zx * 100}% auto`,
          backgroundPosition: `${px * 100}% ${py * 100}%`,
          "--c": meta.color,
        } as CSSProperties
      }
      role="img"
      aria-label={`Map view of ${a.name}`}
    >
      {marker && <span className="thumb__marker" style={{ left: `${mx * 100}%`, top: `${my * 100}%` }} />}
      {children}
    </div>
  );
}
