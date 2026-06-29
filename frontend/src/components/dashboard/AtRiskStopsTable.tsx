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
            className={`rounded-lg border border-l-4 border-slate-200 bg-white p-4 ${styles.row}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={styles.badge}>
                    <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                    {styles.label}
                  </Badge>
                  <span className="text-sm font-semibold text-slate-900">{stop.recipientName}</span>
                  <span className="text-xs text-slate-400">
                    Route {stop.routeId} · Stop #{stop.sequence} · {stop.scheduledTime}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-600">{stop.address}</p>
                <p className="mt-0.5 text-xs text-slate-400">Provider: {provider.name}</p>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-xs font-medium text-slate-500">
                  {formatDistance(alert.distanceMiles)} from outage
                </span>
                <div className="flex flex-wrap justify-end gap-1">
                  <Badge className="bg-slate-100 text-slate-600 ring-slate-500/20">
                    Floor {stop.floor}
                  </Badge>
                  {outage.singleElevator && (
                    <Badge className="bg-red-100 text-red-700 ring-red-600/20">
                      Single elevator
                    </Badge>
                  )}
                  {outage.chronicOffender && (
                    <Badge className="bg-purple-100 text-purple-700 ring-purple-600/20">
                      Chronic offender
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span aria-hidden="true" className="mt-0.5 text-slate-400">
                →
              </span>
              <p>
                <span className="font-medium text-slate-900">Suggested action: </span>
                {alert.suggestedAction}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
