import type { HeatForecast } from "../../types";

interface HeatAdvisoryBannerProps {
  forecast: HeatForecast;
}

export function HeatAdvisoryBanner({ forecast }: HeatAdvisoryBannerProps) {
  if (!forecast.isHeatWeek && forecast.daysAbove90 === 0) return null;

  const tomorrow = forecast.forecast.slice(1, 3).find((d) => d.isHeatDay);
  const headline = forecast.isHeatWeek
    ? `Heat week — ${forecast.daysAbove90} day${forecast.daysAbove90 === 1 ? "" : "s"} ≥ 90°F forecast`
    : `Elevated heat — ${forecast.daysAbove90} day${forecast.daysAbove90 === 1 ? "" : "s"} ≥ 90°F forecast`;
  const peak = forecast.peakTempF != null ? `${forecast.peakTempF.toFixed(1)}°F peak` : null;
  const nearTerm = tomorrow ? `Next heat day: ${formatShort(tomorrow.date)}` : null;

  return (
    <section
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm sm:flex-row sm:items-center sm:gap-5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700"
        >
          <SunIcon />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
            Heat advisory
          </p>
          <p className="text-sm font-semibold text-slate-900">{headline}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Elevator complaint volume rises {"1.2×"} during heat weeks — prioritize wellness checks
            on upper-floor recipients.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:ml-auto">
        {peak && (
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-300">
            {peak}
          </span>
        )}
        {nearTerm && (
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-300">
            {nearTerm}
          </span>
        )}
      </div>
      <ForecastStrip forecast={forecast.forecast} />
    </section>
  );
}

interface ForecastStripProps {
  forecast: HeatForecast["forecast"];
}

function ForecastStrip({ forecast }: ForecastStripProps) {
  return (
    <ol className="flex gap-1 overflow-x-auto sm:ml-2">
      {forecast.map((day) => (
        <li
          key={day.date}
          className={`flex min-w-[3.2rem] flex-col items-center rounded-md px-2 py-1.5 text-center text-xs ${
            day.isHeatDay
              ? "bg-amber-200 font-semibold text-amber-900"
              : "bg-white text-slate-600 ring-1 ring-inset ring-amber-200"
          }`}
        >
          <span className="text-[10px] uppercase tracking-wide opacity-70">
            {formatDayLabel(day.date)}
          </span>
          <span className="tabular-nums">{Math.round(day.tempMaxF)}°</span>
        </li>
      ))}
    </ol>
  );
}

function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
