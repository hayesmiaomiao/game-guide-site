"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { GuideCard } from "@/components/GuideCard";
import type { Guide } from "@/lib/content";

export function GuideSearch({ guides }: { guides: Guide[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return guides;

    return guides.filter((guide) =>
      [guide.title, guide.description, guide.game, guide.category, ...guide.tags]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [guides, query]);

  return (
    <section id="search" className="space-y-5">
      <label className="relative block">
        <span className="sr-only">Search guides</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by game, guide type, tag, or keyword"
          className="h-12 w-full rounded-lg border border-line bg-panel pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-mana"
        />
      </label>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {results.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
      {!results.length ? (
        <div className="rounded-lg border border-line bg-panel p-8 text-center text-slate-400">
          No guides found for that search.
        </div>
      ) : null}
    </section>
  );
}
