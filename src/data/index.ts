import raw from "./attractions.json";
import type { Attraction } from "../types";
import { MAP_ASPECT } from "./map";

export const ATTRACTIONS = raw as Attraction[];
export const BY_ID = new Map(ATTRACTIONS.map((a) => [a.id, a]));

/** Order used by the kiosk attract loop and the welcome panel. */
export const FEATURED_ORDER = [
  "supertree-grove",
  "flower-dome",
  "cloud-forest",
  "ocbc-skyway",
  "floral-fantasy",
  "planet",
  "childrens-garden",
  "supertree-observatory",
  "satay-by-the-bay",
];
export const FEATURED = FEATURED_ORDER.map((id) => BY_ID.get(id)!).filter(Boolean);

export const WALK_START_ID = "bayfront-plaza";

/** Keep only known ids, without duplicates, in their original order. */
export function sanitizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && BY_ID.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

export function parseIdList(s: string | null): string[] {
  if (!s) return [];
  return sanitizeIds(s.split(",").map((x) => x.trim()));
}

function dist(a: Attraction, b: Attraction) {
  // Positions are % of width and % of height; correct for the map's aspect ratio.
  const dx = (a.pos.x - b.pos.x) * MAP_ASPECT;
  const dy = a.pos.y - b.pos.y;
  return Math.hypot(dx, dy);
}

/** Nearest-neighbour walking order, starting from the entrance by Bayfront MRT. */
export function walkingOrder(ids: string[], startId = WALK_START_ID): string[] {
  const left = ids.map((id) => BY_ID.get(id)!).filter(Boolean);
  const out: string[] = [];
  let cur = BY_ID.get(startId)!;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (dist(cur, left[i]) < dist(cur, left[best])) best = i;
    cur = left.splice(best, 1)[0];
    out.push(cur.id);
  }
  return out;
}

export function totalMinutes(ids: string[]): number {
  return ids.reduce((sum, id) => sum + (BY_ID.get(id)?.durationMins ?? 0), 0);
}

export function formatMins(m: number): string {
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/**
 * Origin a phone can actually reach. On the local dev server the kiosk is often
 * opened at http://localhost, which on a phone would point at the phone itself —
 * so swap in this computer's Wi-Fi address (injected by vite.config.ts).
 */
export function phoneOrigin(): string {
  const { protocol, hostname, port, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (isLocal && typeof __LAN_IP__ === "string" && __LAN_IP__) {
    return `${protocol}//${__LAN_IP__}${port ? `:${port}` : ""}`;
  }
  return origin;
}

export function handoffUrl(origin: string, selectedId: string | null, plan: string[]): string {
  const p = new URLSearchParams();
  if (selectedId) p.set("a", selectedId);
  if (plan.length) p.set("plan", plan.join(","));
  const q = p.toString().replace(/%2C/g, ",");
  return `${origin}/m${q ? `?${q}` : ""}`;
}
