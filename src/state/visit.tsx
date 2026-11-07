import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { Filter } from "../types";
import { sanitizeIds } from "../data";

export const STORAGE_KEY = "gbtb-plan-v1";

interface VisitState {
  selectedId: string | null;
  plan: string[];
  visited: string[];
  filter: Filter;
}

type Action =
  | { t: "select"; id: string | null }
  | { t: "togglePlan"; id: string }
  | { t: "setPlan"; ids: string[] }
  | { t: "mergePlan"; ids: string[] }
  | { t: "toggleVisited"; id: string }
  | { t: "filter"; f: Filter }
  | { t: "reset" };

const EMPTY: VisitState = { selectedId: null, plan: [], visited: [], filter: "all" };

function reducer(s: VisitState, a: Action): VisitState {
  switch (a.t) {
    case "select":
      return s.selectedId === a.id ? s : { ...s, selectedId: a.id };
    case "togglePlan":
      return s.plan.includes(a.id)
        ? { ...s, plan: s.plan.filter((x) => x !== a.id) }
        : { ...s, plan: [...s.plan, a.id] };
    case "setPlan":
      return { ...s, plan: sanitizeIds(a.ids) };
    case "mergePlan":
      return { ...s, plan: sanitizeIds([...s.plan, ...a.ids]) };
    case "toggleVisited":
      return s.visited.includes(a.id)
        ? { ...s, visited: s.visited.filter((x) => x !== a.id) }
        : { ...s, visited: [...s.visited, a.id] };
    case "filter":
      return { ...s, filter: a.f };
    case "reset":
      return EMPTY;
  }
}

function loadStored(): Pick<VisitState, "plan" | "visited"> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { plan: [], visited: [] };
    const v = JSON.parse(raw);
    return { plan: sanitizeIds(v?.plan), visited: sanitizeIds(v?.visited) };
  } catch {
    return { plan: [], visited: [] };
  }
}

function useVisitStore(persist: boolean) {
  const [state, dispatch] = useReducer(reducer, persist, (p) => (p ? { ...EMPTY, ...loadStored() } : EMPTY));

  useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan: state.plan, visited: state.visited }));
    } catch {
      /* storage unavailable (private mode) — plan just won't persist */
    }
  }, [persist, state.plan, state.visited]);

  const actions = useMemo(
    () => ({
      select: (id: string | null) => dispatch({ t: "select", id }),
      togglePlan: (id: string) => dispatch({ t: "togglePlan", id }),
      setPlan: (ids: string[]) => dispatch({ t: "setPlan", ids }),
      mergePlan: (ids: string[]) => dispatch({ t: "mergePlan", ids }),
      toggleVisited: (id: string) => dispatch({ t: "toggleVisited", id }),
      setFilter: (f: Filter) => dispatch({ t: "filter", f }),
      reset: () => dispatch({ t: "reset" }),
    }),
    [],
  );
  return { ...state, ...actions };
}

type VisitStore = ReturnType<typeof useVisitStore>;
const Ctx = createContext<VisitStore | null>(null);

export function VisitProvider({ persist, children }: { persist: boolean; children: ReactNode }) {
  const store = useVisitStore(persist);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useVisit(): VisitStore {
  const v = useContext(Ctx);
  if (!v) throw new Error("useVisit must be used inside <VisitProvider>");
  return v;
}
