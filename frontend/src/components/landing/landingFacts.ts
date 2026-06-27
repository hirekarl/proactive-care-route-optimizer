export interface LandingFact {
  id: string;
  eyebrow: string;
  value: string;
  label: string;
  detail: string;
  hue: string;
}

export const landingFacts: LandingFact[] = [
  {
    id: "f1",
    eyebrow: "Seniors at risk",
    value: "1.8M",
    label: "older New Yorkers",
    detail: "depend on DFTA-contracted providers for meals, home care, and wellness checks.",
    hue: "#38bdf8",
  },
  {
    id: "f2",
    eyebrow: "Proximity exposure",
    value: "79%",
    label: "of DFTA providers",
    detail: "are within 0.25 miles of a chronic-offender elevator building.",
    hue: "#f472b6",
  },
  {
    id: "f3",
    eyebrow: "Heat amplifier",
    value: "1.20×",
    label: "complaint baseline",
    detail: "during heat weeks (≥90°F) — outages cluster when seniors are most vulnerable.",
    hue: "#fb923c",
  },
  {
    id: "f4",
    eyebrow: "Bronx concentration",
    value: "2.4×",
    label: "citywide rate",
    detail: "of chronic offenders per 10,000 seniors — the worst-hit borough.",
    hue: "#a78bfa",
  },
  {
    id: "f5",
    eyebrow: "Single point of failure",
    value: "135",
    label: "buildings",
    detail: "with a single elevator. One outage = total inaccessibility.",
    hue: "#f87171",
  },
  {
    id: "f6",
    eyebrow: "Proactive shift",
    value: "0.5 mi",
    label: "proximity ring",
    detail: "screens every stop against the live DOB outage feed before workers leave the depot.",
    hue: "#34d399",
  },
];
