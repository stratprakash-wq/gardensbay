import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import type { CSSProperties } from "react";
import { BY_ID, formatMins, totalMinutes, walkingOrder } from "../data";
import { CATEGORIES } from "../data/categories";
import { Icon } from "./Icon";

interface Props {
  variant: "kiosk" | "mobile";
  plan: string[];
  visited?: string[];
  onReorder(ids: string[]): void;
  onRemove(id: string): void;
  onClear(): void;
  onOpen(id: string): void;
  onToggleVisited?(id: string): void;
  onShare?(): void;
}

export function PlanList({ variant, plan, visited = [], onReorder, onRemove, onClear, onOpen, onToggleVisited, onShare }: Props) {
  if (!plan.length) {
    return (
      <div className="plan-empty">
        <div className="plan-empty__art" aria-hidden="true">
          <Icon name="route" size={34} stroke={1.6} />
        </div>
        <h3>Your plan is empty</h3>
        <p>
          Tap a pin, then <strong>Add to my plan</strong>. We'll suggest a walking order
          {variant === "kiosk" ? " and you can take it with you on your phone." : "."}
        </p>
      </div>
    );
  }

  const ordered = walkingOrder(plan);
  const isOptimal = ordered.every((id, i) => id === plan[i]);
  const done = plan.filter((id) => visited.includes(id)).length;

  return (
    <div className={`plan plan--${variant}`}>
      <div className="plan__summary">
        <div>
          <span className="plan__big">{plan.length}</span> {plan.length === 1 ? "stop" : "stops"}
          <span className="plan__sep">·</span>
          about <strong>{formatMins(totalMinutes(plan))}</strong>
        </div>
        {variant === "mobile" && plan.length > 0 && (
          <div className="plan__progress" aria-label={`${done} of ${plan.length} visited`}>
            <motion.span animate={{ width: `${(done / plan.length) * 100}%` }} />
          </div>
        )}
      </div>

      <Reorder.Group axis="y" values={plan} onReorder={onReorder} className="plan__list">
        <AnimatePresence initial={false}>
          {plan.map((id, i) => (
            <PlanItem
              key={id}
              id={id}
              index={i}
              visited={visited.includes(id)}
              variant={variant}
              onRemove={onRemove}
              onOpen={onOpen}
              onToggleVisited={onToggleVisited}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <div className="plan__actions">
        <button className="btn btn--soft" disabled={isOptimal || plan.length < 2} onClick={() => onReorder(ordered)}>
          <Icon name="route" size={18} />
          {isOptimal && plan.length > 1 ? "Best walking order" : "Suggest walking order"}
        </button>
        {onShare && (
          <button className="btn btn--primary" onClick={onShare}>
            <Icon name="share" size={18} />
            Share plan
          </button>
        )}
        <button className="btn btn--ghost btn--danger" onClick={onClear} aria-label="Clear plan">
          <Icon name="trash" size={18} />
          {variant === "kiosk" ? "Clear" : ""}
        </button>
      </div>
    </div>
  );
}

function PlanItem({
  id,
  index,
  visited,
  variant,
  onRemove,
  onOpen,
  onToggleVisited,
}: {
  id: string;
  index: number;
  visited: boolean;
  variant: "kiosk" | "mobile";
  onRemove(id: string): void;
  onOpen(id: string): void;
  onToggleVisited?(id: string): void;
}) {
  const a = BY_ID.get(id)!;
  const meta = CATEGORIES[a.category];
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className={`plan-item ${visited ? "is-visited" : ""}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      style={{ "--c": meta.color } as CSSProperties}
    >
      <span className="plan-item__grip" onPointerDown={(e) => controls.start(e)} aria-hidden="true">
        <Icon name="grip" size={18} stroke={3} />
      </span>
      {variant === "mobile" && onToggleVisited ? (
        <button className={`check ${visited ? "is-on" : ""}`} onClick={() => onToggleVisited(id)} aria-pressed={visited} aria-label={`Mark ${a.name} as visited`}>
          <Icon name="check" size={14} stroke={3.2} />
        </button>
      ) : (
        <span className="plan-item__idx">{index + 1}</span>
      )}
      <button className="plan-item__main" onClick={() => onOpen(id)}>
        <span className="plan-item__name">{a.name}</span>
        <span className="plan-item__sub">
          <span className="dot" /> {meta.label}
          {a.durationMins ? ` · ~${formatMins(a.durationMins)}` : ""}
        </span>
      </button>
      <button className="icon-btn icon-btn--sm" onClick={() => onRemove(id)} aria-label={`Remove ${a.name} from plan`}>
        <Icon name="x" size={16} />
      </button>
    </Reorder.Item>
  );
}
