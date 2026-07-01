import { formatDateTime } from "../../lib/format";

interface HeaderProps {
  title: string;
  subtitle: string;
  lastIngestAt?: string;
}

export function Header({ title, subtitle, lastIngestAt }: HeaderProps) {
  return (
    <header className="relative z-10 flex flex-col gap-4 border-b border-white/10 bg-black/20 px-6 py-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-fuchsia-200/70">
          Proactive Dispatch
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      {lastIngestAt && (
        <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.14)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Last NYC Open Data sync · {formatDateTime(lastIngestAt)}
        </div>
      )}
    </header>
  );
}
