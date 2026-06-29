import { cn } from "@/lib/utils";

export function AdSlot({ label = "Advertisement", className }: { label?: string; className?: string }) {
  return (
    <aside
      className={cn(
        "flex min-h-28 items-center justify-center rounded-lg border border-dashed border-line bg-white/[0.03] px-4 text-center text-xs uppercase tracking-[0.18em] text-slate-500",
        className
      )}
    >
      {label}
    </aside>
  );
}
