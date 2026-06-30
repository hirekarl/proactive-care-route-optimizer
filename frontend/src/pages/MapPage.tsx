import { api } from "../api/client";
import { elevatorAdvocateStats } from "../api/elevatorAdvocateData";
import { Header } from "../components/layout/Header";
import { MapLegend, OutageMap } from "../components/map/OutageMap";
import { Card } from "../components/ui/Card";
import { StateBlock } from "../components/ui/StateBlock";
import { useApi } from "../hooks/useApi";

const topComplaintCount = Math.max(
  ...elevatorAdvocateStats.topBuildings.map((building) => building.count)
);

export function MapPage() {
  const outages = useApi(api.getOutages);
  const stops = useApi(api.getStops);
  const providers = useApi(api.getProviders);

  const loading = outages.loading || stops.loading || providers.loading;
  const error = outages.error ?? stops.error ?? providers.error;
  const ready =
    outages.data && stops.data && providers.data
      ? { outages: outages.data, stops: stops.data, providers: providers.data }
      : null;

  return (
    <>
      <Header
        title="Outage Map"
        subtitle="Neon NYC line-map view of elevator outage risk across active stops"
      />
      <div className="relative z-10 flex flex-col gap-4 p-6">
        <Card>
          {loading || error || !ready ? (
            <StateBlock loading={loading} error={error} />
          ) : (
            <div className="flex flex-col gap-4">
              <OutageMap
                outages={ready.outages}
                stops={ready.stops}
                providers={ready.providers}
                advocateHotspots={elevatorAdvocateStats.topBuildings}
              />
              <MapLegend showAdvocateHotspots />
            </div>
          )}
        </Card>

        <Card
          title="Elevator Advocate hotspot index"
          subtitle="Neon markers surface high-complaint buildings from the public citywide dataset"
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {elevatorAdvocateStats.topBuildings.slice(0, 8).map((building) => (
              <article
                key={building.bin}
                className="rounded-lg border border-white/10 bg-black/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {building.address}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {building.borough} - CD {building.councilDistrict}
                    </p>
                  </div>
                  <span className="bg-fuchsia-300/12 rounded-full px-2 py-1 text-xs font-semibold text-fuchsia-100 ring-1 ring-fuchsia-200/20">
                    {building.count}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#f0abfc,#94a3b8)]"
                    style={{ width: `${(building.count / topComplaintCount) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Risk {building.riskScore.toFixed(2)} / Confidence {building.riskConfidence}%
                </p>
              </article>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
