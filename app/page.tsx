import Link from "next/link";
import { Compass, Crown, Map, Search, Shield, Swords } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { GameCard } from "@/components/GameCard";
import { GuideCard } from "@/components/GuideCard";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllGames, getAllGuides } from "@/lib/content";
import { guideCategories, slugify } from "@/lib/site";

const categoryIcons = [Shield, Compass, Crown, Swords, Map, Search];

export default function HomePage() {
  const guides = getAllGuides();
  const games = getAllGames();

  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-10 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pt-16 lg:px-8">
        <div className="flex min-h-[420px] flex-col justify-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-mana">English Game Guides</p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Clear builds, maps, quests, and walkthroughs for players who want the next right move.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Browse beginner guides, tier lists, build guides, map routes, and quest help written for fast scanning and
            search-friendly answers.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/guides" className="rounded-lg bg-mana px-5 py-3 text-sm font-bold text-slate-950">
              Browse Guides
            </Link>
            <Link href="/games" className="rounded-lg border border-line px-5 py-3 text-sm font-bold text-white">
              View Games
            </Link>
          </div>
        </div>
        <div className="grid content-center gap-4">
          <div className="overflow-hidden rounded-lg border border-line bg-panel">
            <div className="bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center p-6">
              <div className="rounded-lg bg-void/80 p-5 backdrop-blur">
                <p className="text-sm font-bold text-ember">Latest Meta Snapshot</p>
                <h2 className="mt-3 text-2xl font-black text-white">Routes, loadouts, and picks updated weekly.</h2>
                <p className="mt-3 text-sm text-slate-300">
                  Built for organic discovery, quick answers, and ad-friendly article layouts.
                </p>
              </div>
            </div>
          </div>
          <AdSlot label="Homepage leaderboard ad" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Popular" title="Popular Games" href="/games" />
        <div className="grid gap-5 md:grid-cols-3">
          {games.slice(0, 3).map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Fresh" title="Latest Guides" href="/guides" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {guides.slice(0, 6).map((guide) => (
            <GuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Browse" title="Guide Categories" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guideCategories.map((category, index) => {
            const Icon = categoryIcons[index] || Shield;
            return (
              <Link
                key={category}
                href={`/categories/${slugify(category)}`}
                className="flex items-center gap-4 rounded-lg border border-line bg-panel p-5 hover:border-mana"
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-mana/10 text-mana">
                  <Icon size={20} aria-hidden />
                </span>
                <span className="font-bold capitalize text-white">{category}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-[1fr_320px]">
          <Link
            href="/guides#search"
            className="flex min-h-32 items-center justify-between gap-4 rounded-lg border border-line bg-panel p-6 hover:border-mana"
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-mana">Search</p>
              <h2 className="mt-2 text-2xl font-black text-white">Find the exact guide you need</h2>
            </div>
            <Search className="text-mana" size={32} aria-hidden />
          </Link>
          <AdSlot label="Sidebar ad" />
        </div>
      </section>
    </div>
  );
}
