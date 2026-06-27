import { Route, Routes, useLocation } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { MapPage } from "./pages/MapPage";
import { OutagesPage } from "./pages/OutagesPage";
import { ProvidersPage } from "./pages/ProvidersPage";

function App() {
  const location = useLocation();
  if (location.pathname === "/") {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
      </Routes>
    );
  }
  return (
    <AppShell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/outages" element={<OutagesPage />} />
        <Route path="/providers" element={<ProvidersPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;
