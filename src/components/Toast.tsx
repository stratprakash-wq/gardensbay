import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export function Toast({ message, onDone, ms = 4200 }: { message: string | null; onDone(): void; ms?: number }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, [message, ms, onDone]);

  return (
    <div className="toast-host" aria-live="polite">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            className="toast"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={onDone}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
