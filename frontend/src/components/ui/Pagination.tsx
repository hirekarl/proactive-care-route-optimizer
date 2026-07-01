interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  firstShown: number;
  lastShown: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoTo?: (page: number) => void;
  itemLabel?: string;
}

/** Renders the compact prev/next + page-count control shown below paginated lists. */
export function Pagination({
  page,
  pageCount,
  total,
  firstShown,
  lastShown,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onGoTo,
  itemLabel = "items",
}: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
      <span>
        <span className="tabular-nums text-slate-300">
          {firstShown.toLocaleString()}–{lastShown.toLocaleString()}
        </span>{" "}
        of <span className="tabular-nums text-slate-300">{total.toLocaleString()}</span> {itemLabel}
      </span>

      <div className="flex items-center gap-1">
        <PageButton disabled={!canPrev} onClick={onPrev} label="Previous">
          ‹
        </PageButton>
        <span className="px-2 tabular-nums text-slate-300">
          Page {page} / {pageCount}
        </span>
        <PageButton disabled={!canNext} onClick={onNext} label="Next">
          ›
        </PageButton>
        {onGoTo && pageCount > 1 && page > 2 && (
          <PageButton onClick={() => onGoTo(1)} label="First">
            «
          </PageButton>
        )}
        {onGoTo && pageCount > 1 && page < pageCount - 1 && (
          <PageButton onClick={() => onGoTo(pageCount)} label="Last">
            »
          </PageButton>
        )}
      </div>
    </div>
  );
}

interface PageButtonProps {
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function PageButton({ disabled, onClick, label, children }: PageButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-sm font-medium text-slate-300 transition hover:border-fuchsia-200/40 hover:bg-fuchsia-300/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:bg-white/[0.06] disabled:hover:text-slate-300"
    >
      {children}
    </button>
  );
}
