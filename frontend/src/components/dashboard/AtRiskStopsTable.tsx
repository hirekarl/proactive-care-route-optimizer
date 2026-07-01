import { formatDistance, severityStyles } from "../../lib/format";
import type { AtRiskStop } from "../../types";
import { Badge } from "../ui/Badge";

interface AtRiskStopsTableProps {
  stops: AtRiskStop[];
}

export function AtRiskStopsTable({ stops }: AtRiskStopsTableProps) {
  return (
    <ul className="flex flex-col gap-3">
      {stops.map(({ stop, alert, outage, provider }) => {
        const styles = severityStyles[alert.severity];
        return (
          <li
            key={alert.id}
            className={`rounded-lg border border-white/10 bg-black/20 p-4 shadow-[0_12px_34px_rgba(0,0,0,0.18)] ${styles.row}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={styles.badge}>
                    <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                    {styles.label}
                  </Badge>
                  <span className="text-sm font-semibold text-white">{stop.recipientName}</span>
                  <span className="text-xs text-slate-500">
                    Route {stop.routeId} · Stop #{stop.sequence} · {stop.scheduledTime}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-300">{stop.address}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Provider: {provider?.name ?? "Unknown"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-xs font-medium text-slate-400">
                  {formatDistance(alert.distanceMiles)} from outage
                </span>
                <div className="flex flex-wrap justify-end gap-1">
                  <Badge className="bg-white/10 text-slate-200 ring-white/15">
                    Floor {stop.floor}
                  </Badge>
                  {outage.singleElevator && (
                    <Badge className="bg-rose-300/12 text-rose-100 ring-rose-200/25">
                      Single elevator
                    </Badge>
                  )}
                  {outage.chronicOffender && (
                    <Badge className="bg-fuchsia-300/12 text-fuchsia-100 ring-fuchsia-200/25">
                      Chronic offender
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.045] px-3 py-2 text-sm text-slate-300">
              <span aria-hidden="true" className="mt-0.5 text-fuchsia-200">
                -&gt;
              </span>
              <p>
                <span className="font-medium text-white">Suggested action: </span>
                {alert.suggestedAction}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
