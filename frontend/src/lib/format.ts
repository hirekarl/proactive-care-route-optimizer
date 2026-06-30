import type { AlertSeverity } from "../types";

export function formatDistance(miles: number): string {
  const feet = Math.round(miles * 5280);
  if (miles < 0.1) return `${feet} ft`;
  return `${miles.toFixed(2)} mi`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const severityStyles: Record<
  AlertSeverity,
  { label: string; badge: string; dot: string; row: string }
> = {
  critical: {
    label: "Critical",
    badge: "bg-rose-300/12 text-rose-100 ring-rose-200/25",
    dot: "bg-rose-300 shadow-[0_0_12px_rgba(253,164,175,0.8)]",
    row: "border-l-4 border-l-rose-300/80",
  },
  warning: {
    label: "Warning",
    badge: "bg-fuchsia-300/12 text-fuchsia-100 ring-fuchsia-200/25",
    dot: "bg-fuchsia-300 shadow-[0_0_12px_rgba(240,171,252,0.78)]",
    row: "border-l-4 border-l-fuchsia-300/75",
  },
  watch: {
    label: "Watch",
    badge: "bg-sky-300/12 text-sky-100 ring-sky-200/25",
    dot: "bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.72)]",
    row: "border-l-4 border-l-sky-300/70",
  },
};
