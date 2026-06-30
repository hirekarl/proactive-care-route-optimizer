import { Link, NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard", end: true, icon: GridIcon },
  { to: "/map", label: "Outage Map", end: false, icon: MapIcon },
  { to: "/outages", label: "Outages", end: false, icon: AlertIcon },
  { to: "/providers", label: "Providers", end: false, icon: BuildingIcon },
];

export function Sidebar() {
  return (
    <aside className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-white/10 bg-black/55 shadow-[24px_0_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:flex">
      <Link to="/" className="flex items-center gap-3 px-5 py-5 transition hover:bg-white/[0.04]">
        <img
          src="/care-route-logo.png"
          alt=""
          aria-hidden="true"
          className="h-8 w-8 object-contain brightness-125 invert saturate-0"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-white">Care-Route</p>
          <p className="text-xs text-slate-400">Optimizer</p>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-2 px-4 py-3">
        {navItems.map(({ to, label, end, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "via-fuchsia-200/18 bg-gradient-to-r from-fuchsia-300/35 to-white/5 text-white shadow-[0_0_34px_rgba(232,121,249,0.22)]"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-500">
        NYC DFTA · Proactive Dispatch
      </div>
    </aside>
  );
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
      <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" strokeLinecap="round" />
    </svg>
  );
}
