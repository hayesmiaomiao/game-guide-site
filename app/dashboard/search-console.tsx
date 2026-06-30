"use client";

import {
  CalendarDays,
  Eye,
  MapPin,
  MousePointerClick,
  Percent,
  Search,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import type {
  SearchConsoleDataset,
  SearchConsoleRow
} from "@/lib/search-console";

type DateRange = "7" | "28" | "90" | "all";

type Aggregate = {
  label: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type ChangeAggregate = Aggregate & {
  previousClicks: number;
  clickChange: number;
};

function number(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function percent(value: number) {
  return new Intl.NumberFormat("en", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

function decimal(value: number) {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

function shortPage(value: string) {
  if (!value) return "(unknown page)";
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return value;
  }
}

function aggregateRows(rows: SearchConsoleRow[], key: "page" | "query") {
  const groups = new Map<
    string,
    { clicks: number; impressions: number; weightedPosition: number }
  >();

  for (const row of rows) {
    const label = row[key] || "(not provided)";
    const current = groups.get(label) ?? {
      clicks: 0,
      impressions: 0,
      weightedPosition: 0
    };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.weightedPosition += row.position * row.impressions;
    groups.set(label, current);
  }

  return Array.from(groups.entries()).map<Aggregate>(([label, value]) => ({
    label,
    clicks: value.clicks,
    impressions: value.impressions,
    ctr: value.impressions ? value.clicks / value.impressions : 0,
    position: value.impressions
      ? value.weightedPosition / value.impressions
      : 0
  }));
}

function getPeriodChanges(rows: SearchConsoleRow[]) {
  const timestamps = rows
    .map((row) => Number(new Date(`${row.date}T00:00:00Z`)))
    .filter(Number.isFinite);

  if (timestamps.length < 2) return [];

  const first = Math.min(...timestamps);
  const last = Math.max(...timestamps);
  if (first === last) return [];
  const midpoint = first + (last - first) / 2;
  const previous = aggregateRows(
    rows.filter(
      (row) => Number(new Date(`${row.date}T00:00:00Z`)) <= midpoint
    ),
    "page"
  );
  const current = aggregateRows(
    rows.filter(
      (row) => Number(new Date(`${row.date}T00:00:00Z`)) > midpoint
    ),
    "page"
  );
  const previousMap = new Map(previous.map((row) => [row.label, row.clicks]));
  const currentMap = new Map(current.map((row) => [row.label, row]));
  const labels = Array.from(
    new Set(
      previous
        .map((row) => row.label)
        .concat(Array.from(currentMap.keys()))
    )
  );

  return labels.map<ChangeAggregate>((label) => {
    const row = currentMap.get(label) ?? {
      label,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    };
    const previousClicks = previousMap.get(label) ?? 0;

    return {
      ...row,
      previousClicks,
      clickChange: row.clicks - previousClicks
    };
  });
}

export function SearchConsolePanel({ data }: { data: SearchConsoleDataset }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pageFilter, setPageFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>("28");

  const pages = useMemo(
    () =>
      Array.from(
        new Set(data.rows.map((row) => row.page).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [data.rows]
  );

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const latestTimestamp = Math.max(
      ...data.rows
        .map((row) => Number(new Date(`${row.date}T00:00:00Z`)))
        .filter(Number.isFinite),
      0
    );
    const cutoff =
      dateRange === "all"
        ? Number.NEGATIVE_INFINITY
        : latestTimestamp - (Number(dateRange) - 1) * 86_400_000;

    return data.rows.filter((row) => {
      if (pageFilter !== "all" && row.page !== pageFilter) return false;
      if (Number(new Date(`${row.date}T00:00:00Z`)) < cutoff) return false;
      if (
        query &&
        !`${row.query} ${row.page}`.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [data.rows, dateRange, pageFilter, searchQuery]);

  const analytics = useMemo(() => {
    const clicks = filteredRows.reduce((total, row) => total + row.clicks, 0);
    const impressions = filteredRows.reduce(
      (total, row) => total + row.impressions,
      0
    );
    const weightedPosition = filteredRows.reduce(
      (total, row) => total + row.position * row.impressions,
      0
    );
    const pageRows = aggregateRows(filteredRows, "page");
    const queryRows = aggregateRows(filteredRows, "query");
    const changes = getPeriodChanges(filteredRows);
    const averageCtr = impressions ? clicks / impressions : 0;

    return {
      clicks,
      impressions,
      ctr: averageCtr,
      position: impressions ? weightedPosition / impressions : 0,
      winners: changes
        .filter((row) => row.clickChange > 0)
        .sort((left, right) => right.clickChange - left.clickChange)
        .slice(0, 5),
      losers: changes
        .filter((row) => row.clickChange < 0)
        .sort((left, right) => left.clickChange - right.clickChange)
        .slice(0, 5),
      lowCtr: pageRows
        .filter((row) => row.impressions > 0 && row.ctr < averageCtr)
        .sort((left, right) => right.impressions - left.impressions)
        .slice(0, 5),
      highImpressionLowClick: pageRows
        .filter(
          (row) =>
            row.impressions > 0 &&
            row.ctr < Math.max(averageCtr * 0.5, 0.01)
        )
        .sort(
          (left, right) =>
            right.impressions - left.impressions || left.clicks - right.clicks
        )
        .slice(0, 5),
      topQueries: queryRows
        .sort(
          (left, right) =>
            right.clicks - left.clicks || right.impressions - left.impressions
        )
        .slice(0, 10)
    };
  }, [filteredRows]);

  const metrics = [
    {
      label: "Total Clicks",
      value: number(analytics.clicks),
      icon: MousePointerClick,
      tone: "bg-mana/10 text-mana"
    },
    {
      label: "Total Impressions",
      value: number(analytics.impressions),
      icon: Eye,
      tone: "bg-fuchsia-400/10 text-fuchsia-300"
    },
    {
      label: "Average CTR",
      value: percent(analytics.ctr),
      icon: Percent,
      tone: "bg-toxic/10 text-toxic"
    },
    {
      label: "Average Position",
      value: decimal(analytics.position),
      icon: MapPin,
      tone: "bg-amber-400/10 text-amber-300"
    }
  ];

  return (
    <section className="mt-8" aria-labelledby="search-console-heading">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-mana">
            Search Console Intelligence
          </p>
          <h2 id="search-console-heading" className="text-lg font-bold text-white">
            Organic Search Performance
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {data.siteUrl
              ? `${pages.length} landing pages from ${data.startDate} to ${data.endDate}`
              : "Connect Search Console and sync a snapshot to populate this panel."}
          </p>
        </div>
        {data.syncedAt ? (
          <p className="inline-flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays size={14} aria-hidden />
            Synced {new Date(data.syncedAt).toLocaleString("en")}
          </p>
        ) : null}
      </div>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
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
                placeholder="Search query or landing page..."
                className="h-10 w-full rounded border border-line bg-void pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-mana"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-400">
              Page
            </span>
            <select
              value={pageFilter}
              onChange={(event) => setPageFilter(event.target.value)}
              className="h-10 w-full rounded border border-line bg-void px-3 text-sm text-white outline-none focus:border-mana"
            >
              <option value="all">All landing pages</option>
              {pages.map((page) => (
                <option key={page} value={page}>
                  {shortPage(page)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-400">
              Date Range
            </span>
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as DateRange)}
              className="h-10 w-full rounded border border-line bg-void px-3 text-sm text-white outline-none focus:border-mana"
            >
              <option value="7">Latest 7 days</option>
              <option value="28">Latest 28 days</option>
              <option value="90">Latest 90 days</option>
              <option value="all">All synced data</option>
            </select>
          </label>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{metric.label}</p>
                  <p className="mt-2 text-xl font-bold text-white sm:text-2xl">
                    {metric.value}
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

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChangeTable
          title="Top Winners"
          icon={TrendingUp}
          rows={analytics.winners}
          positive
        />
        <ChangeTable
          title="Top Losers"
          icon={TrendingDown}
          rows={analytics.losers}
        />
        <PerformanceTable title="Low CTR Pages" rows={analytics.lowCtr} />
        <PerformanceTable
          title="High Impression, Low Click"
          rows={analytics.highImpressionLowClick}
        />
      </div>

      <div className="mt-4">
        <PerformanceTable
          title="Top Queries"
          rows={analytics.topQueries}
          queryTable
        />
      </div>
    </section>
  );
}

function ChangeTable({
  title,
  icon: Icon,
  rows,
  positive = false
}: {
  title: string;
  icon: typeof TrendingUp;
  rows: ChangeAggregate[];
  positive?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <h3 className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-bold text-white">
        <Icon
          size={16}
          aria-hidden
          className={positive ? "text-toxic" : "text-ember"}
        />
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-white/[0.025] uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Landing Page</th>
              <th className="px-3 py-3 text-right font-semibold">Clicks</th>
              <th className="px-3 py-3 text-right font-semibold">Previous</th>
              <th className="px-4 py-3 text-right font-semibold">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="max-w-[280px] truncate px-4 py-3 text-slate-200">
                  {shortPage(row.label)}
                </td>
                <td className="px-3 py-3 text-right text-slate-300">
                  {number(row.clicks)}
                </td>
                <td className="px-3 py-3 text-right text-slate-400">
                  {number(row.previousClicks)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-bold ${
                    positive ? "text-toxic" : "text-ember"
                  }`}
                >
                  {row.clickChange > 0 ? "+" : ""}
                  {number(row.clickChange)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <EmptyTable /> : null}
      </div>
    </Card>
  );
}

function PerformanceTable({
  title,
  rows,
  queryTable = false
}: {
  title: string;
  rows: Aggregate[];
  queryTable?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <h3 className="border-b border-line px-4 py-3 text-sm font-bold text-white">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead className="bg-white/[0.025] uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">
                {queryTable ? "Query" : "Landing Page"}
              </th>
              <th className="px-3 py-3 text-right font-semibold">Clicks</th>
              <th className="px-3 py-3 text-right font-semibold">Impressions</th>
              <th className="px-3 py-3 text-right font-semibold">CTR</th>
              <th className="px-4 py-3 text-right font-semibold">Position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="max-w-[340px] truncate px-4 py-3 text-slate-200">
                  {queryTable ? row.label : shortPage(row.label)}
                </td>
                <td className="px-3 py-3 text-right text-slate-300">
                  {number(row.clicks)}
                </td>
                <td className="px-3 py-3 text-right text-slate-300">
                  {number(row.impressions)}
                </td>
                <td className="px-3 py-3 text-right text-slate-300">
                  {percent(row.ctr)}
                </td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {decimal(row.position)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <EmptyTable /> : null}
      </div>
    </Card>
  );
}

function EmptyTable() {
  return (
    <p className="border-t border-line px-4 py-6 text-center text-sm text-slate-500">
      No matching Search Console data.
    </p>
  );
}
