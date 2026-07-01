import { useEffect, useMemo, useState } from "react";

interface PaginationResult<T> {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  pageItems: T[];
  goTo: (page: number) => void;
  next: () => void;
  prev: () => void;
  canPrev: boolean;
  canNext: boolean;
  firstShown: number;
  lastShown: number;
}

/**
 * Client-side pagination over a fixed array. Resets to page 1 when the
 * incoming array reference changes (e.g. filter reapplied).
 */
export function usePagination<T>(items: T[], pageSize: number): PaginationResult<T> {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  const clampedPage = Math.min(page, pageCount);

  const pageItems = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, clampedPage, pageSize]);

  const goTo = (next: number) => setPage(Math.max(1, Math.min(pageCount, next)));

  return {
    page: clampedPage,
    pageCount,
    pageSize,
    total,
    pageItems,
    goTo,
    next: () => goTo(clampedPage + 1),
    prev: () => goTo(clampedPage - 1),
    canPrev: clampedPage > 1,
    canNext: clampedPage < pageCount,
    firstShown: total === 0 ? 0 : (clampedPage - 1) * pageSize + 1,
    lastShown: Math.min(total, clampedPage * pageSize),
  };
}
