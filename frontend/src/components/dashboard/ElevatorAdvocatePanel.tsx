import { elevatorAdvocateStats } from "../../api/elevatorAdvocateData";

const topBuildingCount = Math.max(
  1,
  ...elevatorAdvocateStats.topBuildings.map((building) => building.count)
);
const maxMonthlyCount = Math.max(
  1,
  ...elevatorAdvocateStats.monthlyCurrentYear.map((month) => month.count)
);

export function ElevatorAdvocatePanel() {
  const topBorough = elevatorAdvocateStats.boroughBreakdown[0];
  const topBuildings = elevatorAdvocateStats.topBuildings.slice(0, 5);

  return (
    <section className="border-fuchsia-200/12 overflow-hidden rounded-lg border bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.03)_44%,rgba(217,70,239,0.08))] shadow-[0_26px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
      <header className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-fuchsia-200">
            Citywide complaint intelligence
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Elevator Advocate snapshot for route screening
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            {elevatorAdvocateStats.coverage}. Updated {elevatorAdvocateStats.snapshotDate}.
          </p>
        </div>
        <a
          href={elevatorAdvocateStats.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:bg-fuchsia-300/12 w-fit rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-fuchsia-100 transition hover:border-fuchsia-200/50"
        >
          View source data
        </a>
      </header>

      <div className="grid gap-6 p-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="12-mo complaints"
              value={elevatorAdvocateStats.totalComplaints12mo.toLocaleString()}
              detail="Across NYC"
            />
            <Metric
              label="Top borough"
              value={topBorough.name}
              detail={`${topBorough.count.toLocaleString()} complaints (${topBorough.pct}%)`}
            />
            <Metric
              label="Seasonal spike"
              value={`+${elevatorAdvocateStats.seasonalSpikePct}%`}
              detail={`${elevatorAdvocateStats.seasonalSpikeMonth} vs. baseline`}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Borough complaint burden</h3>
              <span className="text-xs text-slate-500">Last 12 months</span>
            </div>
            <div className="space-y-3">
              {elevatorAdvocateStats.boroughBreakdown.map((borough) => (
                <div key={borough.name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{borough.name}</span>
                    <span className="text-slate-400">
                      {borough.count.toLocaleString()} / {borough.pct}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#f0abfc,#a78bfa,#94a3b8)] shadow-[0_0_18px_rgba(217,70,239,0.36)]"
                      style={{ width: `${Math.max(borough.pct, 1.5)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">2026 complaint pace</h3>
              <span className="text-xs text-slate-500">YTD through June</span>
            </div>
            <div className="bg-black/18 grid min-h-36 grid-cols-6 items-end gap-2 rounded-lg border border-white/10 px-3 pb-3 pt-4">
              {elevatorAdvocateStats.monthlyCurrentYear.map((month) => (
                <div
                  key={month.month}
                  className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[0.68rem] font-medium text-slate-300">
                    {month.count.toLocaleString()}
                  </span>
                  <div
                    className="w-full max-w-10 rounded-t-md bg-[linear-gradient(180deg,#f5d0fe,#a78bfa_54%,#475569)] shadow-[0_0_16px_rgba(192,132,252,0.26)]"
                    style={{ height: `${Math.max((month.count / maxMonthlyCount) * 82, 12)}px` }}
                  />
                  <span className="text-[0.68rem] text-slate-500">{month.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Highest complaint buildings</h3>
            <span className="text-xs text-slate-500">Top 5</span>
          </div>
          <div className="space-y-3">
            {topBuildings.map((building, index) => (
              <article
                key={`${building.bin}-${building.address}`}
                className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-[2rem_1fr_auto]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-fuchsia-200/20 bg-fuchsia-200/10 text-xs font-semibold text-fuchsia-100">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-white">{building.address}</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    {building.borough} - BIN {building.bin}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Council District {building.councilDistrict} - {building.repName}
                  </p>
                </div>
                <div className="min-w-28">
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-white">{building.count}</span>
                    <span className="text-slate-500">complaints</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#f0abfc,#64748b)]"
                      style={{ width: `${(building.count / topBuildingCount) * 100}%` }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-b border-white/10 pb-3 sm:border-b-0 sm:border-l sm:pl-4 first:sm:border-l-0 first:sm:pl-0">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-fuchsia-100/80">{detail}</p>
    </div>
  );
}
