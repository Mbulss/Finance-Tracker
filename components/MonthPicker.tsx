"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  className?: string;
}

export function MonthPicker({ value, onChange, className = "" }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 256 });
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [y, m] = value.split("-").map(Number);
  const year = y || new Date().getFullYear();
  const month = m || new Date().getMonth() + 1;

  const label = new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const updatePosition = () => {
    if (typeof document === "undefined" || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    setPosition({
      top: rect.bottom + (isMobile ? 8 : 6),
      left: rect.left,
      width: isMobile ? Math.min(rect.width, 320) : 256,
    });
  };

  useLayoutEffect(() => {
    if (open && buttonRef.current) updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && buttonRef.current && !buttonRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const handleScrollOrResize = () => updatePosition();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  const handleSelect = (newYear: number, newMonth: number) => {
    const next = `${newYear}-${String(newMonth).padStart(2, "0")}`;
    onChange(next);
    setOpen(false);
  };

  const thisMonth = new Date();
  const thisYear = thisMonth.getFullYear();
  const thisMonthNum = thisMonth.getMonth() + 1;

  const dropdownContent = open && (
    <div
      ref={ref}
      className="fixed z-[9999] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-800 p-4 shadow-xl"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        minWidth: 256,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{year}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSelect(year - 1, month)}
            className="flex h-9 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-primary dark:hover:text-primary transition active:scale-90"
            aria-label="Tahun sebelumnya"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleSelect(year + 1, month)}
            className="flex h-9 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-primary dark:hover:text-primary transition active:scale-90"
            aria-label="Tahun berikutnya"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MONTHS.map((name, i) => {
          const num = i + 1;
          const isSelected = month === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => handleSelect(year, num)}
              className={`min-h-[44px] rounded-lg py-2.5 text-sm font-medium transition ${
                isSelected
                  ? "bg-primary text-white"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => handleSelect(thisYear, thisMonthNum)}
        className="mt-3 w-full min-h-[44px] rounded-lg py-3 text-center text-sm font-medium text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
      >
        Bulan ini
      </button>
    </div>
  );

  return (
    <>
      <div className={`relative w-full ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex h-full min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest transition-all focus:outline-none ${
            className.includes("border-none") 
              ? "" 
              : "border border-border dark:border-slate-600 bg-card dark:bg-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <span className="truncate">{label}</span>
          <svg
            className={`h-4 w-4 shrink-0 text-muted dark:text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </>
  );
}
