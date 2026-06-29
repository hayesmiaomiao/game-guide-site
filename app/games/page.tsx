import type { Metadata } from "next";
import { GameCard } from "@/components/GameCard";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllGames } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Games",
  description: "Browse all supported games with walkthroughs, builds, tier lists, maps, quests, and beginner guides.",
  alternates: { canonical: absoluteUrl("/games") }
};

export default function GamesPage() {
  const games = getAllGames();

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Library" title="Games" />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
    </section>
  );
}
