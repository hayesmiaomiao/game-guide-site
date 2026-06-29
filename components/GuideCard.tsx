import Image from "next/image";
import Link from "next/link";
import { Clock, Signal } from "lucide-react";
import type { Guide } from "@/lib/content";
import { slugify } from "@/lib/site";

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-panel shadow-glow transition hover:-translate-y-0.5 hover:border-mana/70">
      <Link href={`/guides/${guide.slug}`} className="block">
        <div className="relative aspect-[16/9] bg-slate-900">
          <Image
            src={guide.coverImage}
            alt={guide.coverAlt || `${guide.title} cover image`}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover"
          />
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={`/categories/${slugify(guide.category)}`}
            className="rounded bg-mana/10 px-2 py-1 font-medium text-mana"
          >
            {guide.category}
          </Link>
          <Link href={`/games/${slugify(guide.game)}`} className="rounded bg-white/5 px-2 py-1 text-slate-300">
            {guide.game}
          </Link>
        </div>
        <Link href={`/guides/${guide.slug}`}>
          <h2 className="text-lg font-bold leading-snug text-white hover:text-mana">{guide.title}</h2>
        </Link>
        <p className="line-clamp-2 text-sm text-slate-400">{guide.description}</p>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Signal size={14} aria-hidden />
            {guide.difficulty}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} aria-hidden />
            {guide.readingTime}
          </span>
        </div>
      </div>
    </article>
  );
}
