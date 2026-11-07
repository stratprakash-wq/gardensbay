import type { Category, Filter, Attraction } from "../types";
import type { IconName } from "../components/Icon";

interface CategoryMeta {
  label: string;
  color: string;
  /** Text/icon colour that reads on `color`. */
  ink: string;
  icon: IconName;
  /** Minor pins render smaller and never pulse. */
  minor: boolean;
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  conservatory: { label: "Conservatory", color: "#E86A92", ink: "#fff", icon: "dome", minor: false },
  attraction: { label: "Attraction", color: "#F4B860", ink: "#13221A", icon: "star", minor: false },
  garden: { label: "Garden", color: "#1F5E3B", ink: "#fff", icon: "leaf", minor: false },
  lake: { label: "Lake & wetland", color: "#2B7FA8", ink: "#fff", icon: "wave", minor: false },
  dining: { label: "Dining", color: "#D9682B", ink: "#fff", icon: "fork", minor: true },
  facility: { label: "Facility", color: "#5E6E66", ink: "#fff", icon: "info", minor: true },
  transport: { label: "Getting here", color: "#542c68", ink: "#fff", icon: "train", minor: true },
};

export const FILTERS: { id: Filter; label: string; color: string }[] = [
  { id: "all", label: "All", color: "#0E3B2A" },
  { id: "conservatory", label: "Conservatories", color: CATEGORIES.conservatory.color },
  { id: "attraction", label: "Attractions", color: CATEGORIES.attraction.color },
  { id: "garden", label: "Gardens", color: CATEGORIES.garden.color },
  { id: "lake", label: "Lakes", color: CATEGORIES.lake.color },
  { id: "dining", label: "Dining", color: CATEGORIES.dining.color },
  { id: "facilities", label: "Facilities", color: CATEGORIES.facility.color },
];

export function matchesFilter(a: Attraction, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "facilities") return a.category === "facility" || a.category === "transport";
  return a.category === f;
}
