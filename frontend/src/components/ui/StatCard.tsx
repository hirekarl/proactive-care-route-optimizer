import type { ReactNode } from "react";

type Tone = "default" | "danger" | "warning" | "info";

const toneStyles: Record<Tone, { value: string; iconBg: string; glow: string }> = {
  default: {
    value: "text-white",
    iconBg: "bg-white/10 text-slate-200 ring-white/15",
    glow: "from-white/10",
  },
  danger: {
    value: "text-rose-100",
    iconBg: "bg-rose-300/12 text-rose-200 ring-rose-200/25",
    glow: "from-rose-300/22",
  },
  warning: {
    value: "text-fuchsia-100",
    iconBg: "bg-fuchsia-300/12 text-fuchsia-200 ring-fuchsia-200/25",
    glow: "from-fuchsia-300/24",
  },
  info: {
    value: "text-sky-100",
    iconBg: "bg-sky-300/12 text-sky-200 ring-sky-200/25",
    glow: "from-sky-300/20",
  },
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
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_54px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t ${styles.glow} to-transparent`}
      />
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
        {icon && (
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ${styles.iconBg}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={`relative mt-3 text-3xl font-semibold tabular-nums tracking-tight ${styles.value}`}
      >
        {value}
      </p>
      {hint && <p className="relative mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
