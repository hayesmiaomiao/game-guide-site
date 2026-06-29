import Image from "next/image";
import Link from "next/link";
import { Clock, Signal } from "lucide-react";
import type { Guide } from "@/lib/content";
import { slugify } from "@/lib/site";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type GuideCardProps =
  | {
      guide: Guide;
      title?: never;
      description?: never;
      game?: never;
      category?: never;
      updated?: never;
      readingTime?: never;
      href?: never;
    }
  | {
      guide?: never;
      title: string;
      description: string;
      game: string;
      category: string;
      updated: string;
      readingTime: string;
      href: string;
      tags?: string[];
    };

export function GuideCard(props: GuideCardProps) {
  if (!props.guide) {
    return (
      <Card hover className="p-5">
        <div className="flex flex-wrap gap-2">
          <Badge href={`/games/${slugify(props.game)}`}>{props.game}</Badge>
          <Badge href={`/categories/${slugify(props.category)}`} tone="mana">
            {props.category}
          </Badge>
        </div>
        <h3 className="mt-4 text-lg font-bold leading-snug text-white">
          <Link href={props.href} className="hover:text-mana">
            {props.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{props.description}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Updated {props.updated}</span>
          <span>{props.readingTime}</span>
        </div>
        {props.tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {props.tags.map((tag) => (
              <Badge key={tag} href={`/tags/${slugify(tag)}`}>
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </Card>
    );
  }

  const { guide } = props;
  const gameLabel = guide.gameName || guide.game;
  const categoryLabel = guide.categoryName || guide.category;
  const gameHref = guide.game.startsWith("/") ? guide.game : `/games/${guide.game}`;
  const categoryHref = guide.category.startsWith("/") ? guide.category : `/categories/${guide.category}`;

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
          <Link href={categoryHref} className="rounded bg-mana/10 px-2 py-1 font-medium text-mana">
            {categoryLabel}
          </Link>
          <Link href={gameHref} className="rounded bg-white/5 px-2 py-1 text-slate-300">
            {gameLabel}
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
