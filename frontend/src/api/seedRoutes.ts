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

// Module-level flag prevents re-entry within the same JS context.
let seeding = false;

export async function seedTodaysRoutes(source: RouteStop[] = mockStops): Promise<void> {
  if (USE_MOCK) return;
  if (seeding) return;

  const today = todayISO();
  const key = sessionKey(today);
  const ls = typeof localStorage !== "undefined" ? localStorage : null;
  const stored = ls?.getItem(key) ?? null;

  // "done" = all routes seeded successfully; "pending" = another tab is seeding now.
  if (stored === "done" || stored === "pending") return;

  seeding = true;
  try {
    // Write provisional guard before any POSTs so a concurrent tab sees it and skips.
    ls?.setItem(key, "pending");

    const byRoute = new Map<string, RouteStop[]>();
    for (const stop of source) {
      const list = byRoute.get(stop.routeId);
      if (list) list.push(stop);
      else byRoute.set(stop.routeId, [stop]);
    }

    // If retrying after a partial failure, stored is a JSON array of failed route IDs;
    // only re-post those routes to avoid duplicating the ones that already succeeded.
    if (stored && stored !== "pending") {
      const failedIds = new Set(JSON.parse(stored) as string[]);
      for (const id of byRoute.keys()) {
        if (!failedIds.has(id)) byRoute.delete(id);
      }
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
        if (!res.ok) failed.push(routeId);
      } catch (err) {
        failed.push(routeId);
        console.warn(`[seedTodaysRoutes] ${routeId}:`, err instanceof Error ? err.message : err);
      }
    }

    if (failed.length === 0) {
      ls?.setItem(key, "done");
    } else {
      // Store the failed IDs so the next load retries only them.
      ls?.setItem(key, JSON.stringify(failed));
      console.warn("[seedTodaysRoutes] partial failure, will retry on next load:", failed);
    }
  } finally {
    seeding = false;
  }
}
