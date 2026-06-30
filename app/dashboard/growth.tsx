"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarCheck,
  CircleDollarSign,
  FilePenLine,
  Lightbulb,
  MousePointerClick,
  TrendingDown
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  GrowthAction,
  GrowthPlan,
  GrowthTask,
  RevenueImpact
} from "@/lib/growth";

function formatName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  if (!value) return "Not generated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function actionTone(action: GrowthAction) {
  const tones: Record<GrowthAction, string> = {
    WRITE: "bg-mana/10 text-mana",
    UPDATE: "bg-amber-400/10 text-amber-300",
    REWRITE: "bg-ember/10 text-ember",
    IGNORE: "bg-white/5 text-slate-400"
  };
  return tones[action];
}

function revenueTone(impact: RevenueImpact) {
  if (impact === "High") return "text-toxic";
  if (impact === "Medium") return "text-amber-300";
  return "text-slate-400";
}

function PriorityScore({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "bg-ember/10 text-ember"
      : score >= 55
        ? "bg-amber-400/10 text-amber-300"
        : "bg-mana/10 text-mana";

  return (
    <span
      className={`inline-flex min-w-11 justify-center rounded px-2 py-1 text-xs font-bold ${tone}`}
      title={`Priority score ${score} out of 100`}
    >
      {score}
    </span>
  );
}

export function GrowthPanel({ plan }: { plan: GrowthPlan }) {
  const todaysTasks = plan.tasks.slice(0, plan.summary.todaysWork);
  const metrics = [
    {
      label: "Today's Work",
      value: plan.summary.todaysWork,
      detail: `${plan.tasks.length} actionable`,
      icon: CalendarCheck,
      tone: "bg-mana/10 text-mana"
    },
    {
      label: "Highest Opportunity",
      value: plan.summary.highestOpportunityScore,
      detail: plan.summary.highestOpportunity,
      icon: BarChart3,
      tone: "bg-toxic/10 text-toxic"
    },
    {
      label: "Pages Losing Ranking",
      value: plan.summary.pagesLosingRanking,
      detail: "Position declined",
      icon: TrendingDown,
      tone: "bg-ember/10 text-ember"
    },
    {
      label: "Pages with Low CTR",
      value: plan.summary.pagesWithLowCtr,
      detail: "Below expected CTR",
      icon: MousePointerClick,
      tone: "bg-fuchsia-400/10 text-fuchsia-300"
    },
    {
      label: "High Potential Keywords",
      value: plan.summary.highPotentialKeywords,
      detail: "Priority 1 or 2",
      icon: Lightbulb,
      tone: "bg-amber-400/10 text-amber-300"
    }
  ];

  return (
    <section className="mt-8" aria-labelledby="growth-heading">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-mana">
            Growth Engine
          </p>
          <h2 id="growth-heading" className="text-lg font-bold text-white">
            Daily Growth Plan
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Content priorities from review, traffic, keywords, and patch health.
          </p>
        </div>
        <div className="text-left text-xs text-slate-500 sm:text-right">
          <p>Generated {formatDate(plan.generatedAt)}</p>
          <p className="mt-1">
            Search Console:{" "}
            {plan.inputStatus.searchConsoleRows
              ? `${plan.inputStatus.searchConsoleRows} rows`
              : "awaiting sync"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.label}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{metric.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {metric.value}
                  </p>
                  <p
                    className="mt-1 truncate text-xs text-slate-500"
                    title={metric.detail}
                  >
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

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Top Priority Table</h3>
          <p className="mt-1 text-xs text-slate-500">
            The first {todaysTasks.length} tasks form today&apos;s work queue.
          </p>
        </div>
        <p className="hidden text-xs text-slate-500 sm:block">
          Scores are normalized to 100
        </p>
      </div>

      <Card className="mt-3 hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-line bg-white/[0.025] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 font-semibold">Priority</th>
                <th className="px-3 py-3 font-semibold">Task</th>
                <th className="px-3 py-3 font-semibold">Action</th>
                <th className="px-3 py-3 font-semibold">Reason</th>
                <th className="px-3 py-3 text-right font-semibold">
                  Traffic Gain
                </th>
                <th className="px-3 py-3 font-semibold">Revenue Impact</th>
                <th className="px-3 py-3 font-semibold">Score Mix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {todaysTasks.map((task) => (
                <tr key={task.id} className="hover:bg-white/[0.025]">
                  <td className="px-3 py-3">
                    <PriorityScore score={task.priorityScore} />
                  </td>
                  <td className="max-w-[270px] px-3 py-3">
                    <TaskTitle task={task} />
                    <p className="mt-1 text-xs text-slate-500">
                      {formatName(task.game)} / {formatName(task.category)}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-bold ${actionTone(task.action)}`}
                    >
                      {task.action}
                    </span>
                  </td>
                  <td className="max-w-[340px] px-3 py-3 text-xs leading-5 text-slate-400">
                    {task.reason}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-200">
                    +{task.estimatedTrafficGain}
                  </td>
                  <td
                    className={`px-3 py-3 font-semibold ${revenueTone(task.estimatedRevenueImpact)}`}
                  >
                    {task.estimatedRevenueImpact}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                    SEO {task.seoScore} / Traffic {task.trafficScore} / CTR{" "}
                    {task.ctrScore} / Fresh {task.freshnessScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!todaysTasks.length ? <EmptyPlan /> : null}
      </Card>

      <div className="mt-3 space-y-3 md:hidden">
        {todaysTasks.map((task) => (
          <Card key={task.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <TaskTitle task={task} />
                <p className="mt-1 text-xs text-slate-500">
                  {formatName(task.game)} / {formatName(task.category)}
                </p>
              </div>
              <PriorityScore score={task.priorityScore} />
            </div>
            <div className="mt-3 flex items-center gap-2 border-y border-line py-3">
              <span
                className={`rounded px-2 py-1 text-xs font-bold ${actionTone(task.action)}`}
              >
                {task.action}
              </span>
              <span className="text-xs text-slate-400">
                +{task.estimatedTrafficGain} estimated visits
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{task.reason}</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <CircleDollarSign size={14} aria-hidden />
                Revenue impact
              </span>
              <span
                className={`font-semibold ${revenueTone(task.estimatedRevenueImpact)}`}
              >
                {task.estimatedRevenueImpact}
              </span>
            </div>
          </Card>
        ))}
        {!todaysTasks.length ? (
          <Card className="overflow-hidden">
            <EmptyPlan />
          </Card>
        ) : null}
      </div>
    </section>
  );
}

function TaskTitle({ task }: { task: GrowthTask }) {
  return task.kind === "guide" && task.slug ? (
    <Link
      href={`/guides/${task.slug}`}
      className="font-semibold text-white hover:text-mana"
    >
      {task.title}
    </Link>
  ) : (
    <span className="inline-flex items-start gap-2 font-semibold text-white">
      <FilePenLine size={15} aria-hidden className="mt-0.5 shrink-0 text-mana" />
      {task.title}
    </span>
  );
}

function EmptyPlan() {
  return (
    <p className="border-t border-line px-4 py-7 text-center text-sm text-slate-500">
      No growth tasks are currently scheduled.
    </p>
  );
}
