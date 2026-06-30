import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { readKeywordIdeas, type KeywordIdea } from "../../lib/keywords";
import type {
  GrowthAction,
  GrowthPlan,
  GrowthTask,
  RevenueImpact
} from "../../lib/growth";
import type {
  SearchConsoleDataset,
  SearchConsoleRow
} from "../../lib/search-console/types";

const root = process.cwd();
const guidesDirectory = path.join(root, "content", "guides");
const patchesDirectory = path.join(root, "content", "patches");
const reviewPath = path.join(root, "review-report.json");
const searchConsolePath = path.join(root, "data", "search-console.json");

type ReviewGuide = {
  slug: string;
  seoScore: number;
  needsRewrite: boolean;
  topProblems: string[];
};

type ReviewReport = {
  generatedAt?: string;
  guides?: ReviewGuide[];
};

type PatchRecord = {
  currentPatch?: string;
  updatedGuides?: string[];
};

type GuideDocument = {
  slug: string;
  title: string;
  game: string;
  category: string;
  keyword: string;
  patch: string;
  updated: string;
  needsUpdate: boolean;
};

type SearchMetrics = {
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  positionChange: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readGuides(): GuideDocument[] {
  if (!fs.existsSync(guidesDirectory)) return [];

  return fs
    .readdirSync(guidesDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const parsed = matter(
        fs.readFileSync(path.join(guidesDirectory, file), "utf8")
      );
      return {
        slug: String(parsed.data.slug || file.replace(/\.mdx$/, "")),
        title: String(parsed.data.title || file.replace(/\.mdx$/, "")),
        game: slugify(String(parsed.data.game || "")),
        category: slugify(String(parsed.data.category || "uncategorized")),
        keyword: String(parsed.data.keyword || parsed.data.title || ""),
        patch: String(parsed.data.patch || ""),
        updated: String(
          parsed.data.updatedDate ||
            parsed.data.updated ||
            parsed.data.publishDate ||
            parsed.data.date ||
            ""
        ),
        needsUpdate:
          parsed.data.needsUpdate === true || parsed.data.needsUpdate === "true"
      };
    });
}

function readPatches() {
  const patches = new Map<string, PatchRecord>();
  if (!fs.existsSync(patchesDirectory)) return patches;

  for (const file of fs
    .readdirSync(patchesDirectory)
    .filter((name) => name.endsWith(".json"))) {
    patches.set(
      file.replace(/\.json$/, ""),
      readJson<PatchRecord>(path.join(patchesDirectory, file), {})
    );
  }
  return patches;
}

function guidePathname(slug: string) {
  return `/guides/${slug}`.replace(/\/+$/, "");
}

function pageMatchesGuide(page: string, slug: string) {
  try {
    return new URL(page).pathname.replace(/\/+$/, "") === guidePathname(slug);
  } catch {
    return page.replace(/\/+$/, "") === guidePathname(slug);
  }
}

function weightedPosition(rows: SearchConsoleRow[]) {
  const impressions = rows.reduce((total, row) => total + row.impressions, 0);
  if (!impressions) return 0;
  return (
    rows.reduce(
      (total, row) => total + row.position * row.impressions,
      0
    ) / impressions
  );
}

function searchMetrics(rows: SearchConsoleRow[], slug: string): SearchMetrics {
  const guideRows = rows.filter((row) => pageMatchesGuide(row.page, slug));
  const clicks = guideRows.reduce((total, row) => total + row.clicks, 0);
  const impressions = guideRows.reduce(
    (total, row) => total + row.impressions,
    0
  );
  const timestamps = guideRows
    .map((row) => Number(new Date(`${row.date}T00:00:00Z`)))
    .filter(Number.isFinite);
  let positionChange = 0;

  if (timestamps.length > 1) {
    const first = Math.min(...timestamps);
    const last = Math.max(...timestamps);
    const midpoint = first + (last - first) / 2;
    const previous = guideRows.filter(
      (row) => Number(new Date(`${row.date}T00:00:00Z`)) <= midpoint
    );
    const current = guideRows.filter(
      (row) => Number(new Date(`${row.date}T00:00:00Z`)) > midpoint
    );
    if (previous.length && current.length) {
      positionChange = weightedPosition(current) - weightedPosition(previous);
    }
  }

  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    averagePosition: weightedPosition(guideRows),
    positionChange
  };
}

function expectedCtr(position: number) {
  if (position <= 0) return 0;
  if (position <= 3) return 0.12;
  if (position <= 5) return 0.08;
  if (position <= 10) return 0.04;
  if (position <= 20) return 0.02;
  return 0.01;
}

function trafficOpportunity(metrics: SearchMetrics) {
  if (!metrics.impressions) return 0;
  const demand = Math.min(85, Math.log10(metrics.impressions + 1) * 22);
  const rankingLoss = Math.min(15, Math.max(0, metrics.positionChange) * 3);
  return clamp(demand + rankingLoss);
}

function ctrOpportunity(metrics: SearchMetrics) {
  if (!metrics.impressions) return 0;
  const target = expectedCtr(metrics.averagePosition);
  if (!target || metrics.ctr >= target) return 0;
  return clamp(((target - metrics.ctr) / target) * 100);
}

function freshnessUrgency(updated: string, patchMismatch: boolean) {
  if (patchMismatch) return 100;
  const timestamp = Number(new Date(updated));
  if (!Number.isFinite(timestamp)) return 80;
  const days = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  if (days <= 30) return 0;
  if (days <= 90) return 30;
  if (days <= 180) return 60;
  if (days <= 365) return 80;
  return 100;
}

function categoryRevenue(category: string) {
  const values: Record<string, number> = {
    "build-guide": 90,
    "tier-list": 85,
    "boss-guide": 78,
    "beginner-guide": 72,
    "quest-guide": 68,
    walkthrough: 65,
    "map-guide": 62
  };
  return values[category] ?? 55;
}

function revenueImpact(score: number): RevenueImpact {
  if (score >= 75) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

function actionForGuide(
  patchMismatch: boolean,
  needsRewrite: boolean,
  seoScore: number,
  priorityScore: number
): GrowthAction {
  if (patchMismatch) return "UPDATE";
  if (needsRewrite || seoScore < 90) return "REWRITE";
  if (priorityScore >= 55) return "UPDATE";
  return "IGNORE";
}

function estimateTrafficGain(
  metrics: SearchMetrics,
  priorityScore: number,
  action: GrowthAction
) {
  if (action === "IGNORE") return 0;
  if (metrics.impressions) {
    const attainableCtrLift = Math.min(
      Math.max(expectedCtr(metrics.averagePosition) - metrics.ctr, 0.01),
      0.12
    );
    return Math.max(1, Math.round(metrics.impressions * attainableCtrLift));
  }
  return Math.max(5, Math.round(priorityScore * 0.35));
}

function guideReason({
  patchMismatch,
  currentPatch,
  needsRewrite,
  topProblems,
  metrics,
  ctrScore,
  action
}: {
  patchMismatch: boolean;
  currentPatch: string;
  needsRewrite: boolean;
  topProblems: string[];
  metrics: SearchMetrics;
  ctrScore: number;
  action: GrowthAction;
}) {
  const reasons: string[] = [];
  if (patchMismatch) {
    reasons.push(
      currentPatch
        ? `Review for current patch ${currentPatch}`
        : "Patch review is required"
    );
  }
  if (needsRewrite && topProblems[0]) reasons.push(topProblems[0]);
  if (metrics.positionChange >= 1) {
    reasons.push(`Average position fell ${metrics.positionChange.toFixed(1)} places`);
  }
  if (ctrScore >= 35) reasons.push("CTR is below the expected range for its position");
  if (!reasons.length && action === "IGNORE") {
    return "No urgent content, traffic, or freshness issue detected";
  }
  if (!reasons.length) reasons.push("High combined growth opportunity");
  return reasons.slice(0, 2).join(". ");
}

function analyzeGuide(
  guide: GuideDocument,
  review: ReviewGuide | undefined,
  patch: PatchRecord | undefined,
  searchRows: SearchConsoleRow[]
): GrowthTask {
  const seoScore = clamp(review?.seoScore ?? 0);
  const needsRewrite = review?.needsRewrite ?? seoScore < 90;
  const currentPatch = String(patch?.currentPatch || "");
  const patchMismatch =
    guide.needsUpdate ||
    Boolean(currentPatch && guide.patch && guide.patch !== currentPatch) ||
    Boolean(patch?.updatedGuides?.includes(guide.slug));
  const metrics = searchMetrics(searchRows, guide.slug);
  const trafficScore = trafficOpportunity(metrics);
  const ctrScore = ctrOpportunity(metrics);
  const freshnessScore = freshnessUrgency(guide.updated, patchMismatch);
  const revenueScore = clamp(
    categoryRevenue(guide.category) * 0.8 + trafficScore * 0.2
  );
  const opportunityScore =
    (100 - seoScore) * 0.28 +
    trafficScore * 0.2 +
    ctrScore * 0.16 +
    freshnessScore * 0.2 +
    revenueScore * 0.16;
  const priorityScore = clamp(
    opportunityScore + (patchMismatch ? 22 : 0) + (needsRewrite ? 8 : 0)
  );
  const action = actionForGuide(
    patchMismatch,
    needsRewrite,
    seoScore,
    priorityScore
  );

  return {
    id: `guide:${guide.slug}`,
    kind: "guide",
    slug: guide.slug,
    title: guide.title,
    game: guide.game,
    category: guide.category,
    action,
    priorityScore,
    seoScore,
    trafficScore,
    ctrScore,
    freshnessScore,
    revenueScore,
    reason: guideReason({
      patchMismatch,
      currentPatch,
      needsRewrite,
      topProblems: review?.topProblems ?? [],
      metrics,
      ctrScore,
      action
    }),
    estimatedTrafficGain: estimateTrafficGain(
      metrics,
      priorityScore,
      action
    ),
    estimatedRevenueImpact: revenueImpact(revenueScore),
    clicks: metrics.clicks,
    impressions: metrics.impressions,
    ctr: metrics.ctr,
    averagePosition: metrics.averagePosition,
    positionChange: metrics.positionChange,
    needsUpdate: patchMismatch,
    needsRewrite
  };
}

function keywordTask(keyword: KeywordIdea): GrowthTask {
  const priorityScore = clamp(88 - (keyword.priority - 1) * 16);
  const revenueScore = clamp(categoryRevenue(keyword.category));
  const sourceLabel = keyword.source
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    id: `keyword:${slugify(keyword.game)}:${slugify(keyword.keyword)}`,
    kind: "keyword",
    slug: "",
    title: keyword.keyword,
    game: slugify(keyword.game),
    category: keyword.category,
    action: "WRITE",
    priorityScore,
    seoScore: 0,
    trafficScore: priorityScore,
    ctrScore: 0,
    freshnessScore: 0,
    revenueScore,
    reason: `Priority ${keyword.priority} opportunity from ${sourceLabel}`,
    estimatedTrafficGain: Math.max(15, Math.round(priorityScore * 0.75)),
    estimatedRevenueImpact: revenueImpact(revenueScore),
    clicks: 0,
    impressions: 0,
    ctr: 0,
    averagePosition: 0,
    positionChange: 0,
    needsUpdate: false,
    needsRewrite: false
  };
}

export function analyzeGrowth(): GrowthPlan {
  const reviews = readJson<ReviewReport>(reviewPath, {});
  const searchConsole = readJson<SearchConsoleDataset>(searchConsolePath, {
    version: 1,
    siteUrl: "",
    syncedAt: "",
    startDate: "",
    endDate: "",
    rows: []
  });
  const patches = readPatches();
  const pendingKeywords = readKeywordIdeas().filter(
    (keyword) => keyword.status === "pending"
  );
  const reviewMap = new Map(
    (reviews.guides ?? []).map((review) => [review.slug, review])
  );
  const guides = readGuides()
    .map((guide) =>
      analyzeGuide(
        guide,
        reviewMap.get(guide.slug),
        patches.get(guide.game),
        searchConsole.rows
      )
    )
    .sort((left, right) => right.priorityScore - left.priorityScore);
  const tasks = guides
    .filter((guide) => guide.action !== "IGNORE")
    .concat(pendingKeywords.map(keywordTask))
    .sort(
      (left, right) =>
        right.priorityScore - left.priorityScore ||
        right.estimatedTrafficGain - left.estimatedTrafficGain
    );
  const highest = tasks[0];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    inputStatus: {
      reviewGeneratedAt: reviews.generatedAt ?? "",
      searchConsoleSyncedAt: searchConsole.syncedAt,
      searchConsoleRows: searchConsole.rows.length,
      patchFiles: patches.size,
      pendingKeywords: pendingKeywords.length
    },
    summary: {
      todaysWork: Math.min(10, tasks.length),
      highestOpportunity: highest?.title ?? "No urgent growth work",
      highestOpportunityScore: highest?.priorityScore ?? 0,
      pagesLosingRanking: guides.filter((guide) => guide.positionChange >= 1)
        .length,
      pagesWithLowCtr: guides.filter(
        (guide) => guide.impressions > 0 && guide.ctrScore >= 35
      ).length,
      highPotentialKeywords: pendingKeywords.filter(
        (keyword) => keyword.priority <= 2
      ).length
    },
    guides,
    tasks
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/growth/analyze.ts")) {
  const plan = analyzeGrowth();
  console.log(
    `Analyzed ${plan.guides.length} guides and ${plan.inputStatus.pendingKeywords} pending keywords.`
  );
  console.log(
    `Highest opportunity: ${plan.summary.highestOpportunity} (${plan.summary.highestOpportunityScore})`
  );
}
