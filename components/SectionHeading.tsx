import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  href
}: {
  eyebrow?: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-mana">{eyebrow}</p> : null}
        <h2 className="text-2xl font-black text-white sm:text-3xl">{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="shrink-0 text-sm font-medium text-slate-300 hover:text-white">
          View all
        </Link>
      ) : null}
    </div>
  );
}
