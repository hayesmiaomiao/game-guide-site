export function AdSlot({ label = "Advertisement" }: { label?: string }) {
  return (
    <aside className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-line bg-white/[0.03] px-4 text-center text-xs uppercase tracking-[0.18em] text-slate-500">
      {label}
    </aside>
  );
}
