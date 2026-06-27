import { api } from "../api/client";
import { AtRiskStopsTable } from "../components/dashboard/AtRiskStopsTable";
import { BoroughRiskChart } from "../components/dashboard/BoroughRiskChart";
import { OutagesTrendChart } from "../components/dashboard/OutagesTrendChart";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { StateBlock } from "../components/ui/StateBlock";
import { useApi } from "../hooks/useApi";

export function DashboardPage() {
  const summary = useApi(api.getDashboardSummary);
  const atRisk = useApi(api.getAtRiskStops);

  return (
    <>
      <Header
        title="Dispatcher Dashboard"
        subtitle="Elevator-outage risk across active senior-care routes"
        lastIngestAt={summary.data?.lastIngestAt}
      />
      <div className="flex flex-col gap-6 p-6">
        {summary.loading || summary.error ? (
          <StateBlock loading={summary.loading} error={summary.error} />
        ) : (
          summary.data && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Active outages"
                  value={summary.data.activeOutages}
                  hint="Open DOB elevator complaints"
                  tone="danger"
                  icon={<DotIcon />}
                />
                <StatCard
                  label="At-risk stops"
                  value={summary.data.atRiskStops}
                  hint="Within 0.5 mi of an outage"
                  tone="warning"
                  icon={<DotIcon />}
                />
                <StatCard
                  label="Single-elevator bldgs"
                  value={summary.data.singleElevatorBuildings}
                  hint="Outage = total inaccessibility"
                  tone="danger"
                  icon={<DotIcon />}
                />
                <StatCard
                  label="Heat risk multiplier"
                  value={`${summary.data.heatRiskMultiplier.toFixed(2)}×`}
                  hint="Complaint volume vs. baseline"
                  tone="info"
                  icon={<DotIcon />}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Risk by borough" subtitle="Outages, at-risk stops, chronic offenders">
                  <BoroughRiskChart data={summary.data.boroughBreakdown} />
                </Card>
                <Card title="Active outages trend" subtitle="Citywide, last 7 days">
                  <OutagesTrendChart data={summary.data.outagesTrend} />
                </Card>
              </div>
            </>
          )
        )}

        <Card
          title="At-risk stops — action queue"
          subtitle="Screened against the live outage feed before dispatch"
        >
          {atRisk.loading || atRisk.error || !atRisk.data?.length ? (
            <StateBlock
              loading={atRisk.loading}
              error={atRisk.error}
              empty={!atRisk.loading && !atRisk.error && !atRisk.data?.length}
              emptyLabel="No at-risk stops — all routes clear."
            />
          ) : (
            <AtRiskStopsTable stops={atRisk.data} />
          )}
        </Card>
      </div>
    </>
  );
}

function DotIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}
