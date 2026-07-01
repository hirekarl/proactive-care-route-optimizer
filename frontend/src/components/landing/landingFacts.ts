export interface LandingFact {
  id: string;
  eyebrow: string;
  value: string;
  label: string;
  detail: string;
  hue: string;
  tabIndex: number;
}

export const landingFacts: LandingFact[] = [
  {
    id: "dashboard",
    eyebrow: "Dispatcher Dashboard",
    value: "Overview",
    label: "Live Risk Metrics",
    detail:
      "Elevator-outage risk tracking across active senior-care routes, including risk by borough and active complaints queue.",
    hue: "#38bdf8",
    tabIndex: 0,
  },
  {
    id: "map",
    eyebrow: "Outage Map",
    value: "Interactive",
    label: "Live Spatial Analysis",
    detail:
      "Map outages, active routes, and senior-care providers with 0.5-mile proximity rings to identify at-risk locations.",
    hue: "#a78bfa",
    tabIndex: 1,
  },
  {
    id: "outages",
    eyebrow: "Outages Feed",
    value: "DOB Complaints",
    label: "Real-time Alerts",
    detail:
      "Comprehensive table of active DOB complaints ingested from NYC Open Data, flagged by chronic offenders and single-elevator buildings.",
    hue: "#fb923c",
    tabIndex: 2,
  },
  {
    id: "providers",
    eyebrow: "Providers Directory",
    value: "DFTA Care",
    label: "Contracted Partners",
    detail:
      "Database of active senior-care delivery providers, showing location, borough, client counts, and route assignments.",
    hue: "#34d399",
    tabIndex: 3,
  },
];
