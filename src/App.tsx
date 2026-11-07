import { MotionConfig } from "framer-motion";
import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";

function Loading() {
  return (
    <div className="loading" role="status">
      <img src="/icons/icon.svg" alt="" width={56} height={56} />
      <span>Growing the garden…</span>
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Loading />}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  );
}
