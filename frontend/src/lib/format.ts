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
    badge: "bg-red-100 text-red-800 ring-red-600/20",
    dot: "bg-red-500",
    row: "border-l-red-500",
  },
  warning: {
    label: "Warning",
    badge: "bg-amber-100 text-amber-800 ring-amber-600/20",
    dot: "bg-amber-500",
    row: "border-l-amber-500",
  },
  watch: {
    label: "Watch",
    badge: "bg-sky-100 text-sky-800 ring-sky-600/20",
    dot: "bg-sky-500",
    row: "border-l-sky-500",
  },
};
