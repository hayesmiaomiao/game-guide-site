import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  className,
  contentClassName
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8", className)}>
      {title ? (
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-mana">{eyebrow}</p> : null}
            <h2 className="text-2xl font-black text-white sm:text-3xl">{title}</h2>
            {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
