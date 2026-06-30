"use client";

import {
  Ban,
  Check,
  CircleGauge,
  FilePlus2,
  Flame,
  Layers3,
  Radar
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { TrendOpportunity, TrendReport } from "@/lib/trends";

type TodoFileHandle = {
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
};

type PickerWindow = Window & {
  showOpenFilePicker?: (options: {
    multiple: boolean;
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<TodoFileHandle[]>;
};

function sourceName(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function priorityFor(score: number) {
  if (score >= 80) return 1;
  if (score >= 65) return 2;
  return 3;
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((values) => values.some(Boolean));
}

function trendCommand(action: "create" | "ignore", id: string) {
  return `npm run trends -- --${action} "${id.replace(/"/g, '\\"')}"`;
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "bg-ember/10 text-ember"
      : score >= 65
        ? "bg-amber-400/10 text-amber-300"
        : "bg-mana/10 text-mana";
  return (
    <span className={`inline-flex min-w-11 justify-center rounded px-2 py-1 text-xs font-bold ${tone}`}>
      {score}
    </span>
  );
}

export function TrendsPanel({ report }: { report: TrendReport }) {
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem("gamevault-ignored-trends") || "[]"
      ) as unknown;
      if (Array.isArray(stored)) {
        setIgnoredIds(stored.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      setIgnoredIds([]);
    }
  }, []);

  const topOpportunities = useMemo(
    () =>
      report.opportunities
        .filter(
          (item) =>
            !item.alreadyCovered &&
            !item.ignored &&
            !ignoredIds.includes(item.id)
        )
        .slice(0, 20),
    [ignoredIds, report.opportunities]
  );
  const successfulSources = report.sourceStatus.filter(
    (source) => source.status === "ok"
  ).length;
  const metrics = [
    {
      label: "Today's Opportunities",
      value: topOpportunities.length,
      detail: `${report.summary.actionable} actionable`,
      icon: Flame,
      tone: "bg-ember/10 text-ember"
    },
    {
      label: "Already Covered",
      value: report.summary.alreadyCovered,
      detail: "Protected from duplicates",
      icon: Check,
      tone: "bg-toxic/10 text-toxic"
    },
    {
      label: "In Keyword Backlog",
      value: report.summary.inBacklog,
      detail: "Already queued",
      icon: Layers3,
      tone: "bg-mana/10 text-mana"
    },
    {
      label: "Average Score",
      value: report.summary.averageScore,
      detail: `${successfulSources}/${report.sourceStatus.length} sources ready`,
      icon: CircleGauge,
      tone: "bg-fuchsia-400/10 text-fuchsia-300"
    }
  ];

  async function createTodo(item: TrendOpportunity) {
    const picker = (window as PickerWindow).showOpenFilePicker;
    if (!picker) {
      await navigator.clipboard.writeText(trendCommand("create", item.id));
      setNotice("Create Todo command copied.");
      return;
    }

    try {
      const [handle] = await picker({
        multiple: false,
        suggestedName: "todo.csv",
        types: [
          {
            description: "GameVault keyword backlog",
            accept: { "text/csv": [".csv"] }
          }
        ]
      });
      if (!handle) return;
      const file = await handle.getFile();
      const source = await file.text();
      const rows = parseCsv(source);
      const headers = rows[0] || [];
      const keywordIndex = headers.indexOf("keyword");
      const gameIndex = headers.indexOf("game");
      if (keywordIndex < 0 || gameIndex < 0) {
        throw new Error("Selected CSV is not the GameVault todo.csv file.");
      }
      const duplicate = rows.slice(1).some(
        (row) =>
          slugify(row[keywordIndex] || "") === slugify(item.publishSuggestion) &&
          slugify(row[gameIndex] || "") === slugify(item.game)
      );
      if (!duplicate) {
        const nextRow = [
          item.publishSuggestion,
          item.game,
          item.category,
          item.difficulty,
          priorityFor(item.score),
          "pending",
          item.todoSource
        ]
          .map(csvEscape)
          .join(",");
        const writable = await handle.createWritable();
        await writable.write(`${source.trimEnd()}\n${nextRow}\n`);
        await writable.close();
      }
      setCreatedIds((current) =>
        current.includes(item.id) ? current : current.concat(item.id)
      );
      setNotice(duplicate ? "Opportunity was already in Todo." : "Added to Todo.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice(error instanceof Error ? error.message : "Unable to update Todo.");
    }
  }

  async function ignoreOpportunity(item: TrendOpportunity) {
    const next = Array.from(new Set(ignoredIds.concat(item.id)));
    setIgnoredIds(next);
    window.localStorage.setItem("gamevault-ignored-trends", JSON.stringify(next));
    try {
      await navigator.clipboard.writeText(trendCommand("ignore", item.id));
      setNotice("Ignored locally. Persistent ignore command copied.");
    } catch {
      setNotice("Opportunity ignored locally.");
    }
  }

  return (
    <section className="mt-8" aria-labelledby="trends-heading">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-mana">
            Trend Engine
          </p>
          <h2 id="trends-heading" className="text-lg font-bold text-white">
            Today&apos;s Opportunities
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Fresh SEO ideas ranked by demand, competition, recency, value, and coverage.
          </p>
        </div>
        {notice ? (
          <p role="status" className="text-xs font-semibold text-toxic">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{metric.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{metric.value}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {metric.detail}
                  </p>
                </div>
                <span
                  className={`hidden h-9 w-9 shrink-0 place-items-center rounded sm:grid ${metric.tone}`}
                >
                  <Icon size={17} aria-hidden />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Top 20</h3>
          <p className="mt-1 text-xs text-slate-500">
            Duplicate guides and queued keywords are excluded.
          </p>
        </div>
        <Radar size={18} aria-hidden className="text-mana" />
      </div>

      <Card className="mt-3 hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left text-sm">
            <thead className="border-b border-line bg-white/[0.025] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 font-semibold">Score</th>
                <th className="px-3 py-3 font-semibold">Opportunity</th>
                <th className="px-3 py-3 font-semibold">Game</th>
                <th className="px-3 py-3 font-semibold">Source</th>
                <th className="px-3 py-3 font-semibold">Intent</th>
                <th className="px-3 py-3 font-semibold">Commercial</th>
                <th className="px-3 py-3 font-semibold">Score Mix</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {topOpportunities.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.025]">
                  <td className="px-3 py-3">
                    <ScoreBadge score={item.score} />
                  </td>
                  <td className="max-w-[300px] px-3 py-3">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {item.publishSuggestion}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-slate-300">{item.game}</td>
                  <td className="px-3 py-3 text-xs text-slate-400">
                    {sourceName(item.source)}
                  </td>
                  <td className="max-w-[220px] px-3 py-3 text-xs leading-5 text-slate-400">
                    {item.searchIntent}
                  </td>
                  <td className="px-3 py-3 text-slate-300">
                    {item.commercialIntent}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                    P {item.popularity} / C {item.competition} / F {item.freshness} / V{" "}
                    {item.commercialValue} / G {item.existingCoverage}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void createTodo(item)}
                        disabled={item.inBacklog || createdIds.includes(item.id)}
                        className="inline-flex h-9 items-center gap-2 rounded bg-mana px-3 text-xs font-bold text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {item.inBacklog || createdIds.includes(item.id) ? (
                          <Check size={14} aria-hidden />
                        ) : (
                          <FilePlus2 size={14} aria-hidden />
                        )}
                        {item.inBacklog || createdIds.includes(item.id)
                          ? "In Todo"
                          : "Create Todo"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void ignoreOpportunity(item)}
                        title="Ignore opportunity"
                        className="grid h-9 w-9 place-items-center rounded border border-line text-slate-400 hover:border-ember hover:text-ember"
                      >
                        <Ban size={15} aria-hidden />
                        <span className="sr-only">Ignore {item.title}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!topOpportunities.length ? <EmptyTrends /> : null}
      </Card>

      <div className="mt-3 space-y-3 md:hidden">
        {topOpportunities.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.game} / {sourceName(item.source)}
                </p>
              </div>
              <ScoreBadge score={item.score} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {item.publishSuggestion}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs text-slate-500">
                {item.commercialIntent} commercial intent
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void createTodo(item)}
                  disabled={item.inBacklog || createdIds.includes(item.id)}
                  className="inline-flex h-9 items-center gap-2 rounded bg-mana px-3 text-xs font-bold text-slate-950 disabled:opacity-50"
                >
                  <FilePlus2 size={14} aria-hidden />
                  {item.inBacklog || createdIds.includes(item.id)
                    ? "In Todo"
                    : "Create Todo"}
                </button>
                <button
                  type="button"
                  onClick={() => void ignoreOpportunity(item)}
                  title="Ignore opportunity"
                  className="grid h-9 w-9 place-items-center rounded border border-line text-slate-400"
                >
                  <Ban size={15} aria-hidden />
                  <span className="sr-only">Ignore {item.title}</span>
                </button>
              </div>
            </div>
          </Card>
        ))}
        {!topOpportunities.length ? (
          <Card className="overflow-hidden">
            <EmptyTrends />
          </Card>
        ) : null}
      </div>
    </section>
  );
}

function EmptyTrends() {
  return (
    <p className="border-t border-line px-4 py-7 text-center text-sm text-slate-500">
      No uncovered opportunities are available today.
    </p>
  );
}
