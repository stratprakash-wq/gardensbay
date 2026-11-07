import { lazy } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { VisitProvider } from "./state/visit";

const KioskView = lazy(() => import("./views/KioskView"));
const MobileView = lazy(() => import("./views/MobileView"));

/** `/` picks a mode: landscape screens ≥ 1200px wide → kiosk, everything else → mobile (spec §6). */
function DeviceSwitch() {
  const { search } = useLocation();
  const wide = window.innerWidth >= 1200 && window.innerWidth > window.innerHeight;
  return <Navigate to={`${wide ? "/kiosk" : "/m"}${search}`} replace />;
}

/** `/a/<id>` is a short share link that opens mobile mode on that attraction. */
function AttractionLink() {
  const { id } = useParams();
  return <Navigate to={`/m?a=${encodeURIComponent(id ?? "")}`} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DeviceSwitch />} />
      <Route
        path="/kiosk"
        element={
          <VisitProvider persist={false}>
            <KioskView />
          </VisitProvider>
        }
      />
      <Route
        path="/m"
        element={
          <VisitProvider persist>
            <MobileView />
          </VisitProvider>
        }
      />
      <Route path="/a/:id" element={<AttractionLink />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
