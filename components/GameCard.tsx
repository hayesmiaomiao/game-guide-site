import Image from "next/image";
import Link from "next/link";
import type { getAllGames } from "@/lib/content";

type Game = ReturnType<typeof getAllGames>[number];

export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="group overflow-hidden rounded-lg border border-line bg-panel transition hover:-translate-y-0.5 hover:border-ember/70"
    >
      <div className="relative aspect-[16/9]">
        <Image
          src={game.coverImage}
          alt={game.coverAlt}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-white">{game.name}</h2>
          <span className="rounded bg-ember/15 px-2 py-1 text-xs font-medium text-ember">{game.guideCount} guides</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">{game.description}</p>
      </div>
    </Link>
  );
}
