import type { ReactNode } from "react";

type Tone = "default" | "danger" | "warning" | "info";

const toneStyles: Record<Tone, { value: string; iconBg: string }> = {
  default: { value: "text-slate-900", iconBg: "bg-slate-100 text-slate-600" },
  danger: { value: "text-red-600", iconBg: "bg-red-100 text-red-600" },
  warning: { value: "text-amber-600", iconBg: "bg-amber-100 text-amber-600" },
  info: { value: "text-sky-600", iconBg: "bg-sky-100 text-sky-600" },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
}

export function StatCard({ label, value, hint, icon, tone = "default" }: StatCardProps) {
  const styles = toneStyles[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && (
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.iconBg}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <p className={`mt-3 text-3xl font-semibold tabular-nums ${styles.value}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
