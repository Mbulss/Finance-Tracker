"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

interface SelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  hideAllOption?: boolean;
}

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  className = "",
  buttonClassName = "",
  hideAllOption = false,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedLabel = value === "all" || !value ? placeholder : options.find((o) => o.value === value)?.label ?? value;

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownMinWidth = 200;
      let left = rect.left + window.scrollX;
      
      // If it would overflow right side of viewport, align to right side of button
      if (rect.left + dropdownMinWidth > window.innerWidth - 16) {
        left = rect.right + window.scrollX - dropdownMinWidth;
      }

      // Ensure it doesn't overflow left side
      left = Math.max(16, left);

      setPosition({
        top: rect.bottom + window.scrollY,
        left: left,
        width: Math.max(rect.width, dropdownMinWidth),
      });
    }
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleEvent() {
      updatePosition();
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    window.addEventListener("scroll", handleEvent, true);
    window.addEventListener("resize", handleEvent);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleEvent, true);
      window.removeEventListener("resize", handleEvent);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const dropdownContent = open && (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: position.top + 8,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
      className="max-h-72 min-w-[200px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 shadow-2xl animate-fade-in-up"
    >
      {!hideAllOption && (
        <>
          <button
            type="button"
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
            className={`flex w-full items-center px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest transition ${
              value === "all" || !value
                ? "bg-primary/10 text-primary"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {placeholder}
          </button>
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
        </>
      )}
      <div className="px-1.5 space-y-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className={`flex w-full items-center px-4 py-2.5 rounded-xl text-left text-xs font-bold transition ${
              value === opt.value
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-12 w-full min-w-[160px] items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl px-5 text-sm font-bold text-slate-900 dark:text-white shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10 ${buttonClassName}`}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </div>
  );
}
