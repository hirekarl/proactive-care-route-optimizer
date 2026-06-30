import { useMemo } from "react";

import { api } from "../api/client";
import { elevatorAdvocateStats } from "../api/elevatorAdvocateData";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/Card";
import { StateBlock } from "../components/ui/StateBlock";
import { useApi } from "../hooks/useApi";

const maxBoroughComplaintShare = Math.max(
  ...elevatorAdvocateStats.boroughBreakdown.map((entry) => entry.pct)
);

export function ProvidersPage() {
  const providers = useApi(api.getProviders);

  const exposure = useMemo(() => {
    const currentProviders = providers.data ?? [];
    return elevatorAdvocateStats.boroughBreakdown.map((entry) => {
      const boroughProviders = currentProviders.filter(
        (provider) => provider.borough === entry.name
      );
      return {
        ...entry,
        providerCount: boroughProviders.length,
        seniorsServed: boroughProviders.reduce(
          (total, provider) => total + provider.seniorsServed,
          0
        ),
      };
    });
  }, [providers.data]);

  return (
    <>
      <Header title="Providers" subtitle="DFTA-contracted senior-care delivery providers" />
      <div className="relative z-10 flex flex-col gap-4 p-6">
        {providers.loading || providers.error ? (
          <StateBlock loading={providers.loading} error={providers.error} />
        ) : (
          <>
            <Card
              title="Provider exposure by borough"
              subtitle="Provider coverage compared with Elevator Advocate 12-month complaint burden"
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
              <div className="grid gap-3 xl:grid-cols-5">
                {exposure.map((entry) => (
                  <article
                    key={entry.name}
                    className="bg-black/18 rounded-lg border border-white/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{entry.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.count.toLocaleString()} complaints
                        </p>
                      </div>
                      <span className="bg-fuchsia-300/12 rounded-full px-2 py-1 text-xs font-semibold text-fuchsia-100 ring-1 ring-fuchsia-200/20">
                        {entry.pct}%
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#f0abfc,#a78bfa,#64748b)]"
                        style={{
                          width: `${Math.max((entry.pct / maxBoroughComplaintShare) * 100, 4)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Providers</p>
                        <p className="mt-0.5 font-semibold text-slate-200">{entry.providerCount}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Seniors</p>
                        <p className="mt-0.5 font-semibold text-slate-200">
                          {entry.seniorsServed.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(providers.data ?? []).map((p) => (
                <Card key={p.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">{p.borough}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs font-medium text-slate-200">
                      {p.seniorsServed.toLocaleString()} seniors
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">{p.address}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
