import { api } from "../api/client";
import { elevatorAdvocateStats } from "../api/elevatorAdvocateData";
import { Header } from "../components/layout/Header";
import { MapLegend, OutageMap } from "../components/map/OutageMap";
import { Card } from "../components/ui/Card";
import { StateBlock } from "../components/ui/StateBlock";
import { useApi } from "../hooks/useApi";

const topComplaintCount = Math.max(
  1,
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
      <div className="relative z-10 grid gap-6 p-6 lg:grid-cols-3">
        {/* Left Side: Map Frame (2/3 width) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            {loading || error || !ready ? (
              <StateBlock loading={loading} error={error} />
            ) : (
              <div className="flex flex-col gap-4">
                <OutageMap
                  outages={ready.outages}
                  stops={ready.stops}
                  providers={ready.providers}
                  advocateHotspots={elevatorAdvocateStats.topBuildings}
                  height={460}
                />
                <MapLegend showAdvocateHotspots />
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Hotspot List Frame (1/3 width) */}
        <div className="lg:col-span-1">
          <Card
            title="Vulnerability Hotspot Index"
            subtitle="DOB high-complaint buildings from citywide public feed"
            className="flex h-full flex-col"
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
            <div className="custom-scrollbar max-h-[440px] space-y-3 overflow-y-auto pr-1">
              {elevatorAdvocateStats.topBuildings.map((building) => (
                <article
                  key={building.bin}
                  className="rounded-lg border border-white/10 bg-black/20 p-3 transition-colors hover:border-fuchsia-500/30"
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
                    <span className="bg-fuchsia-300/12 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold text-fuchsia-200 ring-1 ring-fuchsia-200/20">
                      {building.count} complaints
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-400"
                      style={{ width: `${(building.count / topComplaintCount) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 flex justify-between text-[10px] text-slate-500">
                    <span>Risk Score: {building.riskScore.toFixed(2)}</span>
                    <span>Confidence: {building.riskConfidence}%</span>
                  </p>
                </article>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
