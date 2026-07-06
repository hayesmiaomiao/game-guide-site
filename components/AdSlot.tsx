"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function AdSlot({ label = "Advertisement", className }: { label?: string; className?: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if ((window as any).IntersectionObserver == null) {
      // If IntersectionObserver is unavailable, load immediately
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { rootMargin: "300px" }
    );

    obs.observe(el);

    return () => obs.disconnect();
  }, []);

  return (
    <aside
      ref={ref as any}
      className={cn(
        "flex min-h-28 items-center justify-center rounded-lg border border-dashed border-line bg-white/[0.03] px-4 text-center text-xs uppercase tracking-[0.18em] text-slate-500",
        className
      )}
      aria-hidden={!visible}
    >
      {visible ? (
        // Replace this with your real ad markup (iframe, script, etc.)
        <div className="w-full">{label}</div>
      ) : (
        // lightweight placeholder to avoid layout shift
        <div className="w-full opacity-60">{label}</div>
      )}
    </aside>
  );
}
