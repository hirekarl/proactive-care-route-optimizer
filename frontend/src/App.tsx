import { Link, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { MapPage } from "./pages/MapPage";
import { OutagesPage } from "./pages/OutagesPage";
import { ProvidersPage } from "./pages/ProvidersPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/outages" element={<OutagesPage />} />
        <Route path="/providers" element={<ProvidersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Page not found</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">That route is not available.</h1>
      <p className="mt-3 max-w-xl text-slate-600">
        Use the dashboard to return to the dispatcher workflow and continue reviewing routes,
        outages, and provider coverage.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex w-fit rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
      >
        Go to dashboard
      </Link>
    </section>
  );
}

export default App;
