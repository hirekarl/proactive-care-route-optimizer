import { Outlet } from "react-router-dom";

import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-[#050508] text-slate-100">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(232,121,249,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(148,163,184,0.16),transparent_24%),radial-gradient(circle_at_55%_92%,rgba(124,58,237,0.18),transparent_34%),linear-gradient(180deg,#08070b_0%,#050508_54%,#09070d_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-8 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
        <Outlet />
      </main>
    </div>
  );
}
