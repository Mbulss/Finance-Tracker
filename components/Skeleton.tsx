"use client";

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-600 ${className}`}
      style={style}
      aria-hidden
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-28 sm:h-8" />
        </div>
        <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 overflow-hidden">
      <div className="border-b border-border dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/50 px-4 py-3.5">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28 hidden sm:block" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="divide-y divide-border dark:divide-slate-600">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24 hidden sm:block" />
            <Skeleton className="h-4 flex-1 max-w-[120px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 sm:p-6">
      <Skeleton className="h-5 w-40 mb-6" />
      <div className="flex items-end justify-between gap-2 h-48">
        {[40, 65, 45, 80, 55, 70].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
