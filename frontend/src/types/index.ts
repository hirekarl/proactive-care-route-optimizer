export type Borough = "Manhattan" | "Bronx" | "Brooklyn" | "Queens" | "Staten Island";

export type OutageStatus = "ACTIVE" | "CLOSED";

export type AlertSeverity = "critical" | "warning" | "watch";

export interface Provider {
  id: string;
  name: string;
  borough: Borough;
  address: string;
  lat: number;
  lng: number;
  seniorsServed: number;
}

export interface Outage {
  id: string;
  complaintNumber: string;
  status: OutageStatus;
  bin: string;
  address: string;
  borough: Borough;
  zipCode: string;
  lat: number;
  lng: number;
  dateEntered: string;
  chronicOffender: boolean;
  singleElevator: boolean;
}

export interface RouteStop {
  id: string;
  routeId: string;
  sequence: number;
  recipientName: string;
  address: string;
  borough: Borough;
  lat: number;
  lng: number;
  floor: number;
  scheduledTime: string;
  providerId: string;
}

export interface ProximityAlert {
  id: string;
  stopId: string;
  outageId: string;
  distanceMiles: number;
  severity: AlertSeverity;
  suggestedAction: string;
}

export interface BoroughRisk {
  borough: Borough;
  activeOutages: number;
  atRiskStops: number;
  chronicOffenders: number;
}

export interface DashboardSummary {
  activeOutages: number;
  atRiskStops: number;
  providersAffected: number;
  chronicOffenders: number;
  singleElevatorBuildings: number;
  heatRiskMultiplier: number;
  lastIngestAt: string;
  boroughBreakdown: BoroughRisk[];
  outagesTrend: { date: string; outages: number }[];
}

export interface AtRiskStop {
  stop: RouteStop;
  alert: ProximityAlert;
  outage: Outage;
  provider: Provider;
}
