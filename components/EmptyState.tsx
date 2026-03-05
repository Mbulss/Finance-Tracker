"use client";

interface EmptyStateProps {
  icon: "transactions" | "savings";
  title: string;
  description: string;
  className?: string;
}

const Icons = {
  transactions: (
    <svg className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-primary/60 dark:text-sky-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      <path d="M9 12h6m-6 4h6" />
    </svg>
  ),
  savings: (
    <svg className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-primary/60 dark:text-sky-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path d="M8 14h8M8 10h4" />
    </svg>
  ),
};

export function EmptyState({ icon, title, description, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 sm:py-16 px-4 rounded-2xl border-2 border-dashed border-border dark:border-slate-600 bg-gradient-to-b from-slate-50/80 to-slate-50/40 dark:from-slate-800/50 dark:to-slate-800/30 ${className}`}>
      <div className="mb-4 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary dark:text-sky-400">
        {Icons[icon]}
      </div>
      <p className="text-center text-base font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-2 max-w-sm text-center text-sm text-muted dark:text-slate-500">{description}</p>
    </div>
  );
}
