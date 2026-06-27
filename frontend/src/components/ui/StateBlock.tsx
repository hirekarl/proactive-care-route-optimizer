interface StateBlockProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyLabel?: string;
}

export function StateBlock({ loading, error, empty, emptyLabel }: StateBlockProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-6 text-center text-sm text-red-700">{error}</div>
    );
  }
  if (empty) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        {emptyLabel ?? "Nothing to show."}
      </div>
    );
  }
  return null;
}
