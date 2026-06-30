"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  ChartNoAxesCombined,
  Eye,
  MousePointerClick,
  Percent,
  ReceiptText,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  AnalyticsRecommendation,
  GuidePerformance,
  PagePerformanceDataset
} from "@/lib/analytics";

function number(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

function money(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function percent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

function actionTone(action: AnalyticsRecommendation) {
  const values: Record<AnalyticsRecommendation, string> = {
    UPDATE: "bg-amber-400/10 text-amber-300",
    REWRITE: "bg-ember/10 text-ember",
    DELETE: "bg-red-500/10 text-red-300",
    EXPAND: "bg-toxic/10 text-toxic"
  };
  return values[action];
}

type Ranking = {
  title: string;
  pages: GuidePerformance[];
  value: (page: GuidePerformance) => string;
  icon: typeof TrendingUp;
  tone: string;
};

export function AnalyticsPanel({
  performance
}: {
  performance: PagePerformanceDataset;
}) {
  const pages = performance.pages;
  const rankings: Ranking[] = [
    {
      title: "Top Winners",
      pages: [...pages]
        .filter((page) => page.trafficChange > 0)
        .sort((left, right) => right.trafficChange - left.trafficChange)
        .slice(0, 5),
      value: (page) => `+${number(page.trafficChange)}`,
      icon: ArrowUpRight,
      tone: "text-toxic"
    },
    {
      title: "Top Losers",
      pages: [...pages]
        .filter((page) => page.trafficChange < 0)
        .sort((left, right) => left.trafficChange - right.trafficChange)
        .slice(0, 5),
      value: (page) => number(page.trafficChange),
      icon: ArrowDownRight,
      tone: "text-ember"
    },
    {
      title: "Top Revenue Pages",
      pages: [...pages]
        .filter((page) => page.estimatedRevenue > 0)
        .sort(
          (left, right) => right.estimatedRevenue - left.estimatedRevenue
        )
        .slice(0, 5),
      value: (page) => money(page.estimatedRevenue),
      icon: BadgeDollarSign,
      tone: "text-toxic"
    },
    {
      title: "Top Traffic Pages",
      pages: [...pages]
        .filter((page) => page.pageviews > 0)
        .sort((left, right) => right.pageviews - left.pageviews)
        .slice(0, 5),
      value: (page) => `${number(page.pageviews)} views`,
      icon: Eye,
      tone: "text-mana"
    },
    {
      title: "Highest CTR",
      pages: [...pages]
        .filter((page) => page.impressions > 0)
        .sort((left, right) => right.ctr - left.ctr)
        .slice(0, 5),
      value: (page) => percent(page.ctr),
      icon: TrendingUp,
      tone: "text-toxic"
    },
    {
      title: "Lowest CTR",
      pages: [...pages]
        .filter((page) => page.impressions > 0)
        .sort(
          (left, right) =>
            left.ctr - right.ctr || right.impressions - left.impressions
        )
        .slice(0, 5),
      value: (page) => percent(page.ctr),
      icon: TrendingDown,
      tone: "text-ember"
    },
    {
      title: "Highest Revenue Per Visit",
      pages: [...pages]
        .filter((page) => page.pageviews > 0 && page.estimatedRevenue > 0)
        .sort(
          (left, right) => right.revenuePerVisit - left.revenuePerVisit
        )
        .slice(0, 5),
      value: (page) => money(page.revenuePerVisit, 4),
      icon: ReceiptText,
      tone: "text-amber-300"
    }
  ];
  const recommendations = pages
    .filter(
      (page): page is GuidePerformance & {
        recommendation: AnalyticsRecommendation;
      } => Boolean(page.recommendation)
    )
    .sort((left, right) => {
      const order: Record<AnalyticsRecommendation, number> = {
        UPDATE: 0,
        REWRITE: 1,
        EXPAND: 2,
        DELETE: 3
      };
      return (
        order[left.recommendation] - order[right.recommendation] ||
        right.pageviews - left.pageviews
      );
    });
  const cards = [
    {
      label: "Pageviews",
      value: number(performance.summary.pageviews),
      icon: Eye,
      tone: "bg-mana/10 text-mana"
    },
    {
      label: "Organic Clicks",
      value: number(performance.summary.clicks),
      icon: MousePointerClick,
      tone: "bg-fuchsia-400/10 text-fuchsia-300"
    },
    {
      label: "Affiliate Clicks",
      value: number(performance.summary.affiliateClicks),
      icon: ChartNoAxesCombined,
      tone: "bg-amber-400/10 text-amber-300"
    },
    {
      label: "Estimated Revenue",
      value: money(performance.summary.estimatedRevenue),
      icon: BadgeDollarSign,
      tone: "bg-toxic/10 text-toxic"
    },
    {
      label: "Estimated RPM",
      value: money(performance.summary.estimatedRpm),
      icon: Percent,
      tone: "bg-ember/10 text-ember"
    }
  ];

  return (
    <section className="mt-8" aria-labelledby="analytics-heading">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-mana">
            Analytics & Revenue
          </p>
          <h2 id="analytics-heading" className="text-lg font-bold text-white">
            Business Performance
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Traffic, search engagement, affiliate conversion, and revenue efficiency.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          {performance.summary.recommendations} marked recommendations
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{card.label}</p>
                  <p className="mt-2 text-xl font-bold text-white sm:text-2xl">
                    {card.value}
                  </p>
                </div>
                <span
                  className={`hidden h-9 w-9 shrink-0 place-items-center rounded sm:grid ${card.tone}`}
                >
                  <Icon size={17} aria-hidden />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rankings.map((ranking) => (
          <RankingCard key={ranking.title} ranking={ranking} />
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Recommendations</h3>
            <p className="mt-1 text-xs text-slate-500">
              Advisory marks only. DELETE never removes content automatically.
            </p>
          </div>
        </div>
        <Card className="hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-line bg-white/[0.025] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Page</th>
                  <th className="px-3 py-3 font-semibold">Recommendation</th>
                  <th className="px-3 py-3 font-semibold">Reason</th>
                  <th className="px-3 py-3 text-right font-semibold">Views</th>
                  <th className="px-3 py-3 text-right font-semibold">CTR</th>
                  <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {recommendations.map((page) => (
                  <tr key={page.slug} className="hover:bg-white/[0.025]">
                    <td className="max-w-[300px] px-4 py-3">
                      <Link
                        href={`/guides/${page.slug}`}
                        className="font-semibold text-white hover:text-mana"
                      >
                        {page.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${actionTone(page.recommendation)}`}
                      >
                        {page.recommendation}
                      </span>
                    </td>
                    <td className="max-w-[360px] px-3 py-3 text-xs leading-5 text-slate-400">
                      {page.recommendationReason}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-300">
                      {number(page.pageviews)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-300">
                      {percent(page.ctr)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-toxic">
                      {money(page.estimatedRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-3 md:hidden">
          {recommendations.map((page) => (
            <Card key={page.slug} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/guides/${page.slug}`}
                  className="font-semibold leading-5 text-white hover:text-mana"
                >
                  {page.title}
                </Link>
                <span
                  className={`shrink-0 rounded px-2 py-1 text-xs font-bold ${actionTone(page.recommendation)}`}
                >
                  {page.recommendation}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {page.recommendationReason}
              </p>
              <div className="mt-3 flex justify-between border-t border-line pt-3 text-xs text-slate-500">
                <span>{number(page.pageviews)} views</span>
                <span>{percent(page.ctr)} CTR</span>
                <span>{money(page.estimatedRevenue)}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function RankingCard({ ranking }: { ranking: Ranking }) {
  const Icon = ranking.icon;
  return (
    <Card className="overflow-hidden">
      <h3 className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-bold text-white">
        <Icon size={16} aria-hidden className={ranking.tone} />
        {ranking.title}
      </h3>
      {ranking.pages.length ? (
        <ol className="divide-y divide-line/70">
          {ranking.pages.map((page) => (
            <li
              key={page.slug}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <Link
                href={`/guides/${page.slug}`}
                className="min-w-0 truncate text-sm text-slate-200 hover:text-mana"
              >
                {page.title}
              </Link>
              <span className={`shrink-0 text-xs font-bold ${ranking.tone}`}>
                {ranking.value(page)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-7 text-center text-sm text-slate-500">
          No measured data yet.
        </p>
      )}
    </Card>
  );
}
