"use client";

import Link from "next/link";
import {
  BadgeDollarSign,
  ExternalLink,
  MousePointerClick,
  ReceiptText
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { AffiliateReport } from "@/lib/affiliate";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AffiliatePanel({ report }: { report: AffiliateReport }) {
  const topPages = report.pages
    .filter((page) => page.recommendationCount > 0)
    .slice(0, 5);
  const highestPage = topPages[0];
  const cards = [
    {
      label: "Affiliate Clicks",
      value: number(report.summary.affiliateClicks),
      detail: "Imported click snapshot",
      icon: MousePointerClick,
      tone: "bg-mana/10 text-mana"
    },
    {
      label: "Estimated Revenue",
      value: money(report.summary.estimatedRevenue),
      detail: "Clicks multiplied by EPC",
      icon: BadgeDollarSign,
      tone: "bg-toxic/10 text-toxic"
    },
    {
      label: "Pages with Offers",
      value: number(report.summary.guidesWithOffers),
      detail: highestPage?.title || "No recommendations yet",
      icon: ReceiptText,
      tone: "bg-amber-400/10 text-amber-300"
    }
  ];

  return (
    <section className="mt-8" aria-labelledby="affiliate-heading">
      <div className="mb-4">
        <p className="mb-1 text-xs font-bold uppercase text-mana">
          Affiliate Engine
        </p>
        <h2 id="affiliate-heading" className="text-lg font-bold text-white">
          Commerce Performance
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Product coverage, observed clicks, and EPC-based revenue estimates.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {card.value}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500" title={card.detail}>
                    {card.detail}
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

      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="text-sm font-bold text-white">Top Revenue Pages</h3>
          <span className="text-xs text-slate-500">
            {report.summary.guidesWithOffers} monetized guides
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.025] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Page</th>
                <th className="px-3 py-3 font-semibold">Game</th>
                <th className="px-3 py-3 text-right font-semibold">Clicks</th>
                <th className="px-3 py-3 text-right font-semibold">
                  Estimated Revenue
                </th>
                <th className="px-3 py-3 text-right font-semibold">Offers</th>
                <th className="px-4 py-3 font-semibold">Providers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {topPages.map((page) => (
                <tr key={page.slug} className="hover:bg-white/[0.025]">
                  <td className="max-w-[300px] px-4 py-3">
                    <Link
                      href={`/guides/${page.slug}`}
                      className="inline-flex items-center gap-2 font-semibold text-white hover:text-mana"
                    >
                      <span className="truncate">{page.title}</span>
                      <ExternalLink size={13} aria-hidden className="shrink-0" />
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {formatName(page.game)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300">
                    {number(page.affiliateClicks)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-toxic">
                    {money(page.estimatedRevenue)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300">
                    {page.recommendationCount}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {page.providers.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!topPages.length ? (
          <p className="border-t border-line px-4 py-7 text-center text-sm text-slate-500">
            Run the Affiliate Engine to create recommendations.
          </p>
        ) : null}
      </Card>
    </section>
  );
}
