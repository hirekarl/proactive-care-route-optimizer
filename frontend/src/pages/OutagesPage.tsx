import { useMemo, useState } from "react";

import { api } from "../api/client";
import { elevatorAdvocateStats } from "../api/elevatorAdvocateData";
import { Header } from "../components/layout/Header";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Pagination } from "../components/ui/Pagination";
import { StateBlock } from "../components/ui/StateBlock";
import { useApi } from "../hooks/useApi";
import { usePagination } from "../hooks/usePagination";
import { formatDate } from "../lib/format";
import type { Borough } from "../types";

const OUTAGES_PAGE_SIZE = 50;

const BOROUGHS: (Borough | "All")[] = [
  "All",
  "Manhattan",
  "Bronx",
  "Brooklyn",
  "Queens",
  "Staten Island",
];

const topBorough = elevatorAdvocateStats.boroughBreakdown[0];
const maxBoroughComplaints = Math.max(
  ...elevatorAdvocateStats.boroughBreakdown.map((entry) => entry.count)
);

export function OutagesPage() {
  const outages = useApi(api.getOutages);
  const [borough, setBorough] = useState<Borough | "All">("All");

  const filtered = useMemo(
    () => (outages.data ?? []).filter((o) => borough === "All" || o.borough === borough),
    [outages.data, borough]
  );

  const paged = usePagination(filtered, OUTAGES_PAGE_SIZE);

  const selectedBoroughStats =
    borough === "All"
      ? topBorough
      : elevatorAdvocateStats.boroughBreakdown.find((entry) => entry.name === borough);
  const selectedTopBuildings = elevatorAdvocateStats.topBuildings
    .filter((building) => borough === "All" || building.borough === borough)
    .slice(0, 10);

  return (
    <>
      <Header
        title="Outages"
        subtitle="Active DOB elevator complaints ingested from NYC Open Data"
      />
      <div className="relative z-10 flex flex-col gap-4 p-6">
        <Card
          title="Citywide elevator complaint context"
          subtitle={`${elevatorAdvocateStats.totalComplaints12mo.toLocaleString()} 12-month complaints from Elevator Advocate`}
          action={
            <a
              href={elevatorAdvocateStats.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-fuchsia-100 transition hover:border-fuchsia-200/50 hover:bg-fuchsia-300/10"
            >
              Source
            </a>
          }
        >
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <OutageContextMetric
                label="Current filter"
                value={borough === "All" ? "All boroughs" : borough}
                detail={`${filtered.length} active complaints shown`}
              />
              <OutageContextMetric
                label="Highest burden"
                value={selectedBoroughStats?.name ?? topBorough.name}
                detail={`${(selectedBoroughStats ?? topBorough).count.toLocaleString()} complaints`}
              />
              <OutageContextMetric
                label="Seasonal pressure"
                value={`+${elevatorAdvocateStats.seasonalSpikePct}%`}
                detail={`${elevatorAdvocateStats.seasonalSpikeMonth} complaint spike`}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">Borough burden</h3>
                <div className="space-y-3">
                  {elevatorAdvocateStats.boroughBreakdown.map((entry) => (
                    <div key={entry.name}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-slate-200">{entry.name}</span>
                        <span className="text-slate-500">
                          {entry.count.toLocaleString()} / {entry.pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#f0abfc,#a78bfa,#64748b)]"
                          style={{ width: `${(entry.count / maxBoroughComplaints) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">Top complaint buildings</h3>
                <div className="space-y-2">
                  {selectedTopBuildings.map((building) => (
                    <div
                      key={building.bin}
                      className="bg-black/18 flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {building.address}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {building.borough} - BIN {building.bin}
                        </p>
                      </div>
                      <span className="bg-fuchsia-300/12 rounded-full px-2.5 py-1 text-xs font-semibold text-fuchsia-100 ring-1 ring-fuchsia-200/20">
                        {building.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="Active elevator complaints"
          subtitle={`${filtered.length} shown`}
          action={
            <div className="flex flex-wrap gap-1">
              {BOROUGHS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBorough(b)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    borough === b
                      ? "bg-fuchsia-200 text-slate-950"
                      : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          }
        >
          {outages.loading || outages.error ? (
            <StateBlock loading={outages.loading} error={outages.error} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="py-2 pr-4 font-medium">Complaint #</th>
                    <th className="py-2 pr-4 font-medium">Address</th>
                    <th className="py-2 pr-4 font-medium">Borough</th>
                    <th className="py-2 pr-4 font-medium">BIN</th>
                    <th className="py-2 pr-4 font-medium">Filed</th>
                    <th className="py-2 pr-4 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.pageItems.map((o) => (
                    <tr key={o.id} className="border-b border-white/5 last:border-0">
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">
                        {o.complaintNumber}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-200">{o.address}</td>
                      <td className="py-2.5 pr-4 text-slate-400">{o.borough}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">{o.bin}</td>
                      <td className="py-2.5 pr-4 text-slate-400">{formatDate(o.dateEntered)}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {o.singleElevator && (
                            <Badge className="bg-rose-300/12 text-rose-100 ring-rose-200/25">
                              Single
                            </Badge>
                          )}
                          {o.chronicOffender && (
                            <Badge className="bg-fuchsia-300/12 text-fuchsia-100 ring-fuchsia-200/25">
                              Chronic
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={paged.page}
                pageCount={paged.pageCount}
                total={paged.total}
                firstShown={paged.firstShown}
                lastShown={paged.lastShown}
                canPrev={paged.canPrev}
                canNext={paged.canNext}
                onPrev={paged.prev}
                onNext={paged.next}
                onGoTo={paged.goTo}
                itemLabel="complaints"
              />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function OutageContextMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-black/18 rounded-lg border border-white/10 p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-fuchsia-100/80">{detail}</p>
    </div>
  );
}
