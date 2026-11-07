export type Category =
  | "conservatory"
  | "attraction"
  | "garden"
  | "lake"
  | "dining"
  | "facility"
  | "transport";

export type Filter =
  | "all"
  | "conservatory"
  | "attraction"
  | "garden"
  | "lake"
  | "dining"
  | "facilities";

export interface Attraction {
  id: string;
  /** Label printed on the official map (1–37, a–l, …). */
  num: string;
  name: string;
  category: Category;
  tagline: string;
  description: string;
  highlights?: string[];
  ticketed: boolean;
  hours?: string;
  durationMins?: number;
  officialUrl: string;
  /** Hotspot centre in % of map width / height. */
  pos: { x: number; y: number };
  featured?: boolean;
  /** Parent area on the official map key, e.g. "World of Plants". */
  group?: string;
}
