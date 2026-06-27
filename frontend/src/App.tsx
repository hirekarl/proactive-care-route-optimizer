import { Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { MapPage } from "./pages/MapPage";
import { OutagesPage } from "./pages/OutagesPage";
import { ProvidersPage } from "./pages/ProvidersPage";

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/outages" element={<OutagesPage />} />
        <Route path="/providers" element={<ProvidersPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;
