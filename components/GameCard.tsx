import Image from "next/image";
import Link from "next/link";
import type { getAllGames } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Game = ReturnType<typeof getAllGames>[number];

type GameCardProps =
  | {
      game: Game;
      name?: never;
      description?: never;
      guideCount?: never;
      href?: never;
    }
  | {
      game?: never;
      name: string;
      description: string;
      guideCount: number;
      href: string;
    };

export function GameCard(props: GameCardProps) {
  if (!props.game) {
    return (
      <Card hover className="p-5">
        <h3 className="text-lg font-bold text-white">{props.name}</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{props.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-mana">{props.guideCount} guides</span>
          <Button href={props.href} variant="ghost" size="sm" className="px-0">
            View guides
          </Button>
        </div>
      </Card>
    );
  }

  const { game } = props;

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
