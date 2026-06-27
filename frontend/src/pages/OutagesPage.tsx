import { useMemo, useState } from "react";

import { api } from "../api/client";
import { Header } from "../components/layout/Header";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { StateBlock } from "../components/ui/StateBlock";
import { useApi } from "../hooks/useApi";
import { formatDate } from "../lib/format";
import type { Borough } from "../types";

const BOROUGHS: (Borough | "All")[] = [
  "All",
  "Manhattan",
  "Bronx",
  "Brooklyn",
  "Queens",
  "Staten Island",
];

export function OutagesPage() {
  const outages = useApi(api.getOutages);
  const [borough, setBorough] = useState<Borough | "All">("All");

  const filtered = useMemo(
    () => (outages.data ?? []).filter((o) => borough === "All" || o.borough === borough),
    [outages.data, borough]
  );

  return (
    <>
      <Header
        title="Outages"
        subtitle="Active DOB elevator complaints ingested from NYC Open Data"
      />
      <div className="flex flex-col gap-4 p-6">
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
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    borough === b
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-medium">Complaint #</th>
                    <th className="py-2 pr-4 font-medium">Address</th>
                    <th className="py-2 pr-4 font-medium">Borough</th>
                    <th className="py-2 pr-4 font-medium">BIN</th>
                    <th className="py-2 pr-4 font-medium">Filed</th>
                    <th className="py-2 pr-4 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">
                        {o.complaintNumber}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-800">{o.address}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{o.borough}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">{o.bin}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{formatDate(o.dateEntered)}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {o.singleElevator && (
                            <Badge className="bg-red-100 text-red-700 ring-red-600/20">
                              Single
                            </Badge>
                          )}
                          {o.chronicOffender && (
                            <Badge className="bg-purple-100 text-purple-700 ring-purple-600/20">
                              Chronic
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
