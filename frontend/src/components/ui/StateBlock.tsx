interface StateBlockProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyLabel?: string;
}

export function StateBlock({ loading, error, empty, emptyLabel }: StateBlockProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-fuchsia-200" />
        Loading...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-rose-200/20 bg-rose-300/10 px-4 py-6 text-center text-sm text-rose-100">
        {error}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        {emptyLabel ?? "Nothing to show."}
      </div>
    );
  }
  return null;
}
