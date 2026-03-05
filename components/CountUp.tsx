"use client";

import { useEffect, useState } from "react";

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (n: number) => string;
}

export function CountUp({
  value,
  duration = 600,
  className = "",
  formatter = (n) => n.toLocaleString("id-ID"),
}: CountUpProps) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let start = display;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 2;
      setDisplay(Math.round(start + (value - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    if (value !== display) requestAnimationFrame(tick);
  }, [value, duration]);

  useEffect(() => {
    setDisplay(value);
  }, [value]);

  return <span className={className}>{formatter(display)}</span>;
}
