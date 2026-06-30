import type { RouteStop } from "../types";
import { stops as mockStops } from "./mockData";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const BASE = import.meta.env.VITE_API_BASE ?? "/api";
const API_KEY = import.meta.env.VITE_API_KEY;

interface RoutePostBody {
  name: string;
  date: string;
  stops: Array<{
    address: string;
    lat: number;
    lng: number;
    order: number;
    recipientName: string;
    floor: number;
    scheduledTime: string;
    providerId: string;
    borough: string;
  }>;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function sessionKey(date: string): string {
  return `pcro-routes-seeded-${date}`;
}

export async function seedTodaysRoutes(source: RouteStop[] = mockStops): Promise<void> {
  if (USE_MOCK) return;
  const today = todayISO();
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(sessionKey(today))) {
    return;
  }

  const byRoute = new Map<string, RouteStop[]>();
  for (const stop of source) {
    const existing = byRoute.get(stop.routeId);
    if (existing) existing.push(stop);
    else byRoute.set(stop.routeId, [stop]);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  const failed: string[] = [];
  for (const [routeId, routeStops] of byRoute.entries()) {
    routeStops.sort((a, b) => a.sequence - b.sequence);
    const body: RoutePostBody = {
      name: routeId,
      date: today,
      stops: routeStops.map((s, idx) => ({
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        order: idx,
        recipientName: s.recipientName,
        floor: s.floor,
        scheduledTime: s.scheduledTime,
        providerId: s.providerId,
        borough: s.borough,
      })),
    };
    try {
      const res = await fetch(`${BASE}/routes/`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) failed.push(`${routeId}:${res.status}`);
    } catch (err) {
      failed.push(`${routeId}:${err instanceof Error ? err.message : "error"}`);
    }
  }

  if (failed.length === 0 && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(sessionKey(today), "1");
  } else if (failed.length) {
    console.warn("[seedTodaysRoutes] failures:", failed);
  }
}
