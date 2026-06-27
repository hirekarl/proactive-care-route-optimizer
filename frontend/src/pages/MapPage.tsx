import { api } from "../api/client";
import { Header } from "../components/layout/Header";
import { MapLegend, OutageMap } from "../components/map/OutageMap";
import { Card } from "../components/ui/Card";
import { StateBlock } from "../components/ui/StateBlock";
import { useApi } from "../hooks/useApi";

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
        subtitle="Live elevator outages and 0.5-mile proximity rings across active stops"
      />
      <div className="flex flex-col gap-4 p-6">
        <Card>
          {loading || error || !ready ? (
            <StateBlock loading={loading} error={error} />
          ) : (
            <div className="flex flex-col gap-4">
              <OutageMap outages={ready.outages} stops={ready.stops} providers={ready.providers} />
              <MapLegend />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
