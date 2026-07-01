import type { AtRiskStop, DashboardSummary, Outage, Provider, RouteStop } from "../types";
import { buildAtRiskStops, dashboardSummary, outages, providers, stops } from "./mockData";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function get<T>(path: string, fallback: T): Promise<T> {
  if (USE_MOCK) {
    return Promise.resolve(fallback);
  }
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

export const api = {
  getDashboardSummary: () => get<DashboardSummary>("/dashboard/summary/", dashboardSummary),
  getOutages: () => get<Outage[]>("/outages/", outages),
  getProviders: () => get<Provider[]>("/providers/", providers),
  getStops: () => get<RouteStop[]>("/routes/stops/", stops),
  getAtRiskStops: () => get<AtRiskStop[]>("/alerts/at-risk/", buildAtRiskStops()),
};
