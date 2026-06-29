import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
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
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 rounded-lg bg-mana px-5 py-3 text-sm font-bold text-slate-950 hover:bg-white"
            >
              Browse Guides
              <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-3 text-sm font-bold text-white hover:border-mana"
            >
              View Games
              <Gamepad2 size={16} aria-hidden />
            </Link>
          </div>
        </div>
        <div className="grid content-center gap-4">
          <div className="rounded-lg border border-line bg-panel p-5 shadow-glow">
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
          </div>
          <AdSlot label="Homepage Top Ad" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/guides#search"
          aria-label="Search boss guides, builds, quests, maps"
          className="flex min-h-16 items-center gap-4 rounded-lg border border-line bg-panel px-4 py-4 text-slate-400 shadow-glow hover:border-mana hover:text-white sm:px-6"
        >
          <Search className="shrink-0 text-mana" size={22} aria-hidden />
          <span className="text-base">Search boss guides, builds, quests, maps...</span>
        </Link>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-mana">Popular</p>
            <h2 className="text-2xl font-black text-white sm:text-3xl">Popular Games</h2>
          </div>
          <Link href="/games" className="shrink-0 text-sm font-medium text-slate-300 hover:text-white">
            View all games
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredGames.map((game) => {
            const matched = guideCounts.get(game.match || game.name);
            const guideCount = matched?.count || game.fallbackCount;
            const href = matched ? `/games/${matched.slug}` : `/guides#search`;

            return (
              <article key={game.name} className="rounded-lg border border-line bg-panel p-5 transition hover:border-mana">
                <h3 className="text-lg font-bold text-white">{game.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{game.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-mana">{guideCount} guides</span>
                  <Link href={href} className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-mana">
                    View guides
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <AdSlot label="In-feed Ad" />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-mana">Fresh</p>
            <h2 className="text-2xl font-black text-white sm:text-3xl">Latest Guides</h2>
          </div>
          <Link href="/guides" className="shrink-0 text-sm font-medium text-slate-300 hover:text-white">
            View all guides
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {latestGuides.map((guide) => (
            <article key={guide.slug} className="rounded-lg border border-line bg-panel p-5 transition hover:border-mana">
              <div className="flex flex-wrap gap-2 text-xs">
                <Link href={`/games/${slugify(guide.game)}`} className="rounded bg-white/5 px-2 py-1 text-slate-300">
                  {guide.game}
                </Link>
                <Link href={`/categories/${slugify(guide.category)}`} className="rounded bg-mana/10 px-2 py-1 font-medium text-mana">
                  {guide.category}
                </Link>
              </div>
              <h3 className="mt-4 text-lg font-bold leading-snug text-white">
                <Link href={`/guides/${guide.slug}`} className="hover:text-mana">
                  {guide.title}
                </Link>
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{guide.description}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>Updated {guide.updated}</span>
                <span>{guide.readingTime}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
                    className="flex items-center gap-4 rounded-lg border border-line bg-panel p-5 hover:border-mana"
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
          <aside className="rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center gap-3">
              <BookOpen className="text-ember" size={20} aria-hidden />
              <h2 className="text-xl font-black text-white">Trending Guides</h2>
            </div>
            <ol className="mt-4 space-y-3">
              {trendingGuides.map((guide, index) => (
                <li key={guide.slug} className="flex gap-3">
                  <span className="text-sm font-black text-mana">{String(index + 1).padStart(2, "0")}</span>
                  <Link href={`/guides/${guide.slug}`} className="text-sm font-medium leading-6 text-slate-300 hover:text-white">
                    {guide.title}
                  </Link>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <AdSlot label="Bottom Ad" />
      </section>
    </div>
  );
}
