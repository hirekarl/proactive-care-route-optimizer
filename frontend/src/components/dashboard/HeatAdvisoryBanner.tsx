import type { HeatForecast } from "../../types";

interface HeatAdvisoryBannerProps {
  forecast: HeatForecast;
}

export function HeatAdvisoryBanner({ forecast }: HeatAdvisoryBannerProps) {
  if (!forecast.isHeatWeek && forecast.daysAbove90 === 0) return null;

  const tomorrow = forecast.forecast.slice(1, 3).find((d) => d.isHeatDay);
  const headline = forecast.isHeatWeek
    ? `Heat week - ${forecast.daysAbove90} day${forecast.daysAbove90 === 1 ? "" : "s"} at or above 90F`
    : `Elevated heat - ${forecast.daysAbove90} day${forecast.daysAbove90 === 1 ? "" : "s"} at or above 90F`;
  const peak = forecast.peakTempF != null ? `${forecast.peakTempF.toFixed(1)}F peak` : null;
  const nearTerm = tomorrow ? `Next heat day: ${formatShort(tomorrow.date)}` : null;

  return (
    <section
      role="status"
      className="relative overflow-hidden rounded-lg border border-fuchsia-200/15 bg-white/[0.06] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-2/3 bg-[radial-gradient(circle_at_22%_55%,rgba(232,121,249,0.28),transparent_46%),linear-gradient(90deg,rgba(251,113,133,0.14),transparent)]"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="bg-fuchsia-200/12 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-fuchsia-200/20 text-fuchsia-100 shadow-[0_0_28px_rgba(232,121,249,0.22)]"
          >
            <SunIcon />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-fuchsia-200/75">
              Heat advisory
            </p>
            <p className="text-sm font-semibold text-white">{headline}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Elevator complaint volume rises 1.2x during heat weeks. Prioritize wellness checks on
              upper-floor recipients.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {peak && (
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-100">
              {peak}
            </span>
          )}
          {nearTerm && (
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-100">
              {nearTerm}
            </span>
          )}
        </div>
        <ForecastStrip forecast={forecast.forecast} />
      </div>
    </section>
  );
}

interface ForecastStripProps {
  forecast: HeatForecast["forecast"];
}

function ForecastStrip({ forecast }: ForecastStripProps) {
  return (
    <ol className="flex flex-wrap gap-1 sm:ml-2 sm:justify-end">
      {forecast.map((day) => (
        <li
          key={day.date}
          className={`flex min-w-[3.2rem] flex-col items-center rounded-md px-2 py-1.5 text-center text-xs ${
            day.isHeatDay
              ? "bg-fuchsia-200/18 font-semibold text-fuchsia-50 ring-1 ring-fuchsia-200/25"
              : "bg-white/[0.06] text-slate-400 ring-1 ring-inset ring-white/10"
          }`}
        >
          <span className="text-[10px] uppercase tracking-wide opacity-70">
            {formatDayLabel(day.date)}
          </span>
          <span className="tabular-nums">{Math.round(day.tempMaxF)}&deg;</span>
        </li>
      ))}
    </ol>
  );
}

function formatDayLabel(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { weekday: "short" });
}

function formatShort(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
