"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpenText,
  Check,
  Gamepad2,
  ImageIcon,
  Layers3,
  Search,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";

export type DashboardGuide = {
  title: string;
  game: string;
  gameName: string;
  category: string;
  categoryName: string;
  difficulty: string;
  patch: string;
  updated: string;
  needsUpdate: boolean;
  slug: string;
  faqCount: number;
  tocExists: boolean;
  relatedExists: boolean;
  image: string;
  imageAlt: string;
};

type DashboardClientProps = {
  guides: DashboardGuide[];
};

type NeedUpdateFilter = "all" | "yes" | "no";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function newestDate(values: string[]) {
  return values.reduce((latest, value) => {
    const timestamp = Number(new Date(value));
    if (Number.isNaN(timestamp)) return latest;
    return timestamp > latest.timestamp ? { value, timestamp } : latest;
  }, { value: "Not set", timestamp: Number.NEGATIVE_INFINITY }).value;
}

function StatusMark({ value, label }: { value: boolean; label: string }) {
  return value ? (
    <span
      title={`${label}: Yes`}
      aria-label={`${label}: Yes`}
      className="inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded bg-toxic/10 px-2 text-xs font-semibold text-toxic"
    >
      <Check size={14} aria-hidden />
      <span className="hidden xl:inline">Yes</span>
    </span>
  ) : (
    <span
      title={`${label}: No`}
      aria-label={`${label}: No`}
      className="inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded bg-white/5 px-2 text-xs font-semibold text-slate-400"
    >
      <X size={14} aria-hidden />
      <span className="hidden xl:inline">No</span>
    </span>
  );
}

function GuideImage({ guide }: { guide: DashboardGuide }) {
  return guide.image ? (
    <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded border border-line bg-void">
      <Image
        src={guide.image}
        alt={guide.imageAlt}
        fill
        sizes="64px"
        className="object-cover"
      />
    </div>
  ) : (
    <span
      title="No image"
      aria-label="No image"
      className="grid h-10 w-16 shrink-0 place-items-center rounded border border-line bg-white/[0.03] text-slate-500"
    >
      <ImageIcon size={17} aria-hidden />
    </span>
  );
}

export function DashboardClient({ guides }: DashboardClientProps) {
  const [gameFilter, setGameFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [needsUpdateFilter, setNeedsUpdateFilter] =
    useState<NeedUpdateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const games = useMemo(
    () =>
      Array.from(new Map(guides.map((guide) => [guide.game, guide.gameName])).entries())
        .map(([slug, name]) => ({ slug, name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [guides]
  );
  const categories = useMemo(
    () =>
      Array.from(
        new Map(guides.map((guide) => [guide.category, guide.categoryName])).entries()
      )
        .map(([slug, name]) => ({ slug, name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [guides]
  );
  const gameSummary = useMemo(
    () =>
      games.map((game) => {
        const gameGuides = guides.filter((guide) => guide.game === game.slug);
        const lastUpdated = newestDate(gameGuides.map((guide) => guide.updated));
        const latestGuide =
          gameGuides.find((guide) => guide.updated === lastUpdated) || gameGuides[0];

        return {
          ...game,
          guideCount: gameGuides.length,
          latestPatch: latestGuide?.patch || "Not set",
          lastUpdated
        };
      }),
    [games, guides]
  );
  const filteredGuides = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return guides.filter((guide) => {
      if (gameFilter !== "all" && guide.game !== gameFilter) return false;
      if (categoryFilter !== "all" && guide.category !== categoryFilter) return false;
      if (needsUpdateFilter === "yes" && !guide.needsUpdate) return false;
      if (needsUpdateFilter === "no" && guide.needsUpdate) return false;
      if (
        query &&
        ![guide.title, guide.gameName, guide.categoryName, guide.slug, guide.patch]
          .join(" ")
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, gameFilter, guides, needsUpdateFilter, searchQuery]);

  const topCards = [
    {
      label: "Total Guides",
      value: guides.length,
      icon: BookOpenText,
      accent: "text-mana bg-mana/10"
    },
    {
      label: "Need Update",
      value: guides.filter((guide) => guide.needsUpdate).length,
      icon: AlertTriangle,
      accent: "text-ember bg-ember/10"
    },
    {
      label: "Games",
      value: games.length,
      icon: Gamepad2,
      accent: "text-toxic bg-toxic/10"
    },
    {
      label: "Categories",
      value: categories.length,
      icon: Layers3,
      accent: "text-fuchsia-300 bg-fuchsia-400/10"
    }
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-7 border-b border-line pb-6">
        <p className="mb-2 text-xs font-bold uppercase text-mana">Content Operations</p>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Guide Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Guide inventory, patch status, and publishing health from the current MDX
          collection.
        </p>
      </header>

      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="sr-only">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {topCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-400">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                      {item.value}
                    </p>
                  </div>
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded ${item.accent}`}
                  >
                    <Icon size={19} aria-hidden />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="games-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="games-heading" className="text-lg font-bold text-white">
              Game Summary
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Coverage and recency by game.
            </p>
          </div>
        </div>
        <Card className="hidden overflow-hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-white/[0.025] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Game</th>
                  <th className="px-4 py-3 font-semibold">Guide Count</th>
                  <th className="px-4 py-3 font-semibold">Latest Patch</th>
                  <th className="px-4 py-3 font-semibold">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {gameSummary.map((game) => (
                  <tr key={game.slug} className="hover:bg-white/[0.025]">
                    <td className="px-4 py-3 font-semibold text-white">{game.name}</td>
                    <td className="px-4 py-3 text-slate-300">{game.guideCount}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-mana/10 px-2 py-1 text-xs font-semibold text-mana">
                        {game.latestPatch}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatDate(game.lastUpdated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-3 sm:hidden">
          {gameSummary.map((game) => (
            <Card key={game.slug} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{game.name}</h3>
                <span className="rounded bg-mana/10 px-2 py-1 text-xs font-semibold text-mana">
                  {game.latestPatch}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                <div>
                  <dt className="text-slate-500">Guide Count</dt>
                  <dd className="mt-1 font-semibold text-slate-200">{game.guideCount}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last Updated</dt>
                  <dd className="mt-1 font-semibold text-slate-200">
                    {formatDate(game.lastUpdated)}
                  </dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="guides-heading">
        <div className="mb-4">
          <h2 id="guides-heading" className="text-lg font-bold text-white">
            Guide Inventory
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {filteredGuides.length} of {guides.length} guides shown
          </p>
        </div>

        <Card className="mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">
                Search
              </span>
              <span className="relative block">
                <Search
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title, game, patch..."
                  className="h-10 w-full rounded border border-line bg-void pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-mana"
                />
              </span>
            </label>
            <FilterSelect
              label="Game"
              value={gameFilter}
              onChange={setGameFilter}
              options={games}
            />
            <FilterSelect
              label="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories}
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">
                Need Update
              </span>
              <select
                value={needsUpdateFilter}
                onChange={(event) =>
                  setNeedsUpdateFilter(event.target.value as NeedUpdateFilter)
                }
                className="h-10 w-full rounded border border-line bg-void px-3 text-sm text-white outline-none focus:border-mana"
              >
                <option value="all">All statuses</option>
                <option value="yes">Needs update</option>
                <option value="no">Current</option>
              </select>
            </label>
          </div>
        </Card>

        <Card className="hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1240px] text-left text-sm">
              <thead className="border-b border-line bg-white/[0.025] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Title</th>
                  <th className="px-3 py-3 font-semibold">Game</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Patch</th>
                  <th className="px-3 py-3 font-semibold">Updated</th>
                  <th className="px-3 py-3 font-semibold">Need Update</th>
                  <th className="px-3 py-3 font-semibold">Image</th>
                  <th className="px-3 py-3 text-center font-semibold">FAQ</th>
                  <th className="px-3 py-3 text-center font-semibold">TOC</th>
                  <th className="px-3 py-3 text-center font-semibold">Related</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {filteredGuides.map((guide) => (
                  <tr key={guide.slug} className="hover:bg-white/[0.025]">
                    <td className="max-w-[290px] px-3 py-3">
                      <Link
                        href={`/guides/${guide.slug}`}
                        className="font-semibold text-white hover:text-mana"
                      >
                        {guide.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{guide.difficulty}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-300">{guide.gameName}</td>
                    <td className="px-3 py-3 text-slate-300">{guide.categoryName}</td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-white/5 px-2 py-1 text-xs text-slate-300">
                        {guide.patch}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                      {formatDate(guide.updated)}
                    </td>
                    <td className="px-3 py-3">
                      {guide.needsUpdate ? (
                        <span className="inline-flex items-center gap-1 rounded bg-ember/10 px-2 py-1 text-xs font-semibold text-ember">
                          <AlertTriangle size={13} aria-hidden />
                          Yes
                        </span>
                      ) : (
                        <span className="rounded bg-toxic/10 px-2 py-1 text-xs font-semibold text-toxic">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <GuideImage guide={guide} />
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-300">
                      {guide.faqCount}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusMark value={guide.tocExists} label="Table of contents" />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusMark value={guide.relatedExists} label="Related guides" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-3 md:hidden">
          {filteredGuides.map((guide) => (
            <Card key={guide.slug} className="p-4">
              <div className="flex gap-3">
                <GuideImage guide={guide} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="font-semibold leading-5 text-white hover:text-mana"
                  >
                    {guide.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {guide.gameName} · {guide.categoryName}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
                <div>
                  <dt className="text-slate-500">Patch</dt>
                  <dd className="mt-1 font-semibold text-slate-200">{guide.patch}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Updated</dt>
                  <dd className="mt-1 font-semibold text-slate-200">
                    {formatDate(guide.updated)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Need Update</dt>
                  <dd className={guide.needsUpdate ? "mt-1 text-ember" : "mt-1 text-toxic"}>
                    {guide.needsUpdate ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Content Health</dt>
                  <dd className="mt-1 text-slate-200">
                    FAQ {guide.faqCount} · TOC {guide.tocExists ? "Yes" : "No"} · Related{" "}
                    {guide.relatedExists ? "Yes" : "No"}
                  </dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>

        {!filteredGuides.length ? (
          <Card className="mt-3 p-8 text-center text-sm text-slate-400">
            No guides match the current filters.
          </Card>
        ) : null}
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ slug: string; name: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded border border-line bg-void px-3 text-sm text-white outline-none focus:border-mana"
      >
        <option value="all">
          All {label === "Category" ? "categories" : `${label.toLowerCase()}s`}
        </option>
        {options.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
