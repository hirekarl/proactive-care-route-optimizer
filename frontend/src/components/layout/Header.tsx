import { formatDateTime } from "../../lib/format";

interface HeaderProps {
  title: string;
  subtitle: string;
  lastIngestAt?: string;
}

export function Header({ title, subtitle, lastIngestAt }: HeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {lastIngestAt && (
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
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
