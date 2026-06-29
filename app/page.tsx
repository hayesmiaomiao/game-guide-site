import Link from "next/link";
import {
  Crown,
  Gamepad2,
  ListChecks,
  Map as MapIcon,
  Route,
  Search,
  Shield,
  Swords
} from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { GameCard } from "@/components/GameCard";
import { GuideCard } from "@/components/GuideCard";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { getAllGames, getAllGuides } from "@/lib/content";
import { guideCategories, slugify } from "@/lib/site";

const featuredGames = [
  {
    name: "Elden Ring",
    description: "Boss routes, starter builds, weapon paths, and open-world progression.",
    fallbackCount: 18
  },
  {
    name: "Minecraft",
    description: "Survival tips, farms, crafting routes, seeds, and building ideas.",
    fallbackCount: 24
  },
  {
    name: "Honkai Star Rail",
    description: "Tier lists, team cores, relic priorities, and account planning.",
    fallbackCount: 16
  },
  {
    name: "Zelda",
    description: "Shrine help, map routes, Depths exploration, and quest walkthroughs.",
    fallbackCount: 14,
    match: "The Legend of Zelda: Tears of the Kingdom"
  },
  {
    name: "Genshin Impact",
    description: "Character builds, farming routes, team guides, and event priorities.",
    fallbackCount: 21
  },
  {
    name: "Stardew Valley",
    description: "Farm plans, villager gifts, money routes, and seasonal checklists.",
    fallbackCount: 12
  }
];

const homeCategories = [
  { label: "Beginner Guides", slug: "beginner-guide", icon: Shield },
  { label: "Tier Lists", slug: "tier-list", icon: Crown },
  { label: "Build Guides", slug: "build-guide", icon: Swords },
  { label: "Boss Guides", slug: "boss-guides", icon: Gamepad2 },
  { label: "Map Guides", slug: "map-guide", icon: MapIcon },
  { label: "Quest Walkthroughs", slug: "quest-guide", icon: Route }
];

export default function HomePage() {
  const guides = getAllGuides();
  const games = getAllGames();
  const latestGuides = guides.slice(0, 6);
  const trendingGuides = guides.slice(0, 5);

  const guideCounts = new Map(games.map((game) => [game.name, { count: game.guideCount, slug: game.slug }]));

  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-8 pt-10 sm:px-6 md:grid-cols-[1.08fr_0.92fr] md:pt-16 lg:px-8">
        <div className="flex min-h-[420px] flex-col justify-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-mana">English Game Guides</p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Clear game guides, builds, maps, quests, and walkthroughs.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Fast, practical guides for players who want better routes, stronger builds, and fewer wasted hours.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/guides" size="lg">
              Browse Guides
            </Button>
            <Button href="/games" variant="secondary" size="lg">
              View Games
              <Gamepad2 size={16} aria-hidden />
            </Button>
          </div>
        </div>
        <div className="grid content-center gap-4">
          <Card className="p-5 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-ember">Latest Meta Snapshot</p>
                <h2 className="mt-3 text-2xl font-black text-white">Routes, builds, and priority picks updated for fast decisions.</h2>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-mana/10 text-mana">
                <ListChecks size={22} aria-hidden />
              </span>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-300">
              <div className="rounded-lg border border-line bg-white/[0.03] p-3">Beginner routes that avoid wasted upgrades.</div>
              <div className="rounded-lg border border-line bg-white/[0.03] p-3">Build notes focused on practical performance.</div>
              <div className="rounded-lg border border-line bg-white/[0.03] p-3">Map and quest pages structured for quick scanning.</div>
            </div>
          </Card>
          <AdSlot label="Homepage Top Ad" />
        </div>
      </section>

      <Section className="py-6">
        <Link
          href="/guides#search"
          aria-label="Search boss guides, builds, quests, maps"
          className="flex min-h-16 items-center gap-4 rounded-lg border border-line bg-panel px-4 py-4 text-slate-400 shadow-glow hover:border-mana hover:text-white sm:px-6"
        >
          <Search className="shrink-0 text-mana" size={22} aria-hidden />
          <span className="text-base">Search boss guides, builds, quests, maps...</span>
        </Link>
      </Section>

      <Section
        eyebrow="Popular"
        title="Popular Games"
        action={
          <Button href="/games" variant="ghost" size="sm">
            View all games
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredGames.map((game) => {
            const matched = guideCounts.get(game.match || game.name);
            const guideCount = matched?.count || game.fallbackCount;
            const href = matched ? `/games/${matched.slug}` : `/guides#search`;

            return (
              <GameCard key={game.name} name={game.name} description={game.description} guideCount={guideCount} href={href} />
            );
          })}
        </div>
      </Section>

      <Section className="py-4">
        <AdSlot label="In-feed Ad" />
      </Section>

      <Section
        eyebrow="Fresh"
        title="Latest Guides"
        action={
          <Button href="/guides" variant="ghost" size="sm">
            View all guides
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {latestGuides.map((guide) => (
            <GuideCard
              key={guide.slug}
              title={guide.title}
              description={guide.description}
              game={guide.gameName}
              category={guide.categoryName}
              updated={guide.updated}
              readingTime={guide.readingTime}
              href={`/guides/${guide.slug}`}
            />
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-mana">Browse</p>
            <h2 className="text-2xl font-black text-white sm:text-3xl">Guide Categories</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {homeCategories.map((category) => {
                const Icon = category.icon;
                const href = guideCategories.map(slugify).includes(category.slug)
                  ? `/categories/${category.slug}`
                  : "/guides#search";

                return (
                  <Link
                    key={category.label}
                    href={href}
                    className="flex items-center gap-4 rounded-lg border border-line bg-panel p-5 transition hover:border-mana"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-mana/10 text-mana">
                      <Icon size={20} aria-hidden />
                    </span>
                    <span className="font-bold text-white">{category.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <Sidebar
            adLabel="Trending Sidebar Ad"
            trendingGuides={trendingGuides.map((guide) => ({
              title: guide.title,
              href: `/guides/${guide.slug}`
            }))}
          />
        </div>
      </Section>

      <Section className="pb-12 pt-4">
        <AdSlot label="Bottom Ad" />
      </Section>
    </div>
  );
}
