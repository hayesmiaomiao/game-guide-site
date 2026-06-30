import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type {
  AnalyticsRecommendation,
  GuidePerformance,
  PagePerformanceDataset,
  RevenueDataset,
  TrafficDataset,
  TrafficRow
} from "../../lib/analytics";
import type { AffiliateReport } from "../../lib/affiliate";
import type {
  SearchConsoleDataset,
  SearchConsoleRow
} from "../../lib/search-console/types";

const root = process.cwd();
const analyticsDirectory = path.join(root, "data", "analytics");
const trafficPath = path.join(analyticsDirectory, "traffic.json");
const revenuePath = path.join(analyticsDirectory, "revenue.json");
const performancePath = path.join(analyticsDirectory, "page-performance.json");
const searchConsolePath = path.join(root, "data", "search-console.json");
const affiliateReportPath = path.join(root, "data", "affiliate-report.json");
const affiliateClicksPath = path.join(root, "data", "affiliate-clicks.json");
const reviewPath = path.join(root, "review-report.json");
const guidesDirectory = path.join(root, "content", "guides");

type GuideRecord = {
  slug: string;
  title: string;
  game: string;
  category: string;
  updatedDate: string;
  needsUpdate: boolean;
  needsRewrite: boolean;
  seoScore: number;
};

type ReviewReport = {
  guides?: Array<{
    slug: string;
    seoScore: number;
    needsRewrite: boolean;
    topProblems?: string[];
  }>;
};

type AffiliateClicks = {
  pages?: Record<string, number>;
};

type Ga4Response = {
  rowCount?: number;
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJsonAtomic(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function normalizeGa4Date(value: string) {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

async function fetchGa4Traffic(
  propertyId: string,
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const rows: TrafficRow[] = [];
  const limit = 100_000;
  let offset = 0;

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "date" }, { name: "pagePath" }],
            metrics: [{ name: "screenPageViews" }],
            dimensionFilter: {
              filter: {
                fieldName: "pagePath",
                stringFilter: {
                  matchType: "BEGINS_WITH",
                  value: "/guides/",
                  caseSensitive: false
                }
              }
            },
            orderBys: [{ dimension: { dimensionName: "date" } }],
            limit: String(limit),
            offset: String(offset)
          }),
          signal: controller.signal
        }
      );
      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `GA4 Data API returned ${response.status} ${response.statusText}: ${details}`
        );
      }
      const data = (await response.json()) as Ga4Response;
      const pageRows = data.rows ?? [];
      rows.push(
        ...pageRows.map((row) => ({
          date: normalizeGa4Date(row.dimensionValues?.[0]?.value ?? ""),
          page: row.dimensionValues?.[1]?.value ?? "",
          pageviews: Number(row.metricValues?.[0]?.value ?? 0)
        }))
      );
      offset += pageRows.length;
      if (pageRows.length < limit || offset >= Number(data.rowCount ?? 0)) break;
    } finally {
      clearTimeout(timeout);
    }
  }
  return rows;
}

async function syncTraffic(): Promise<TrafficDataset> {
  const existing = readJson<TrafficDataset>(trafficPath, {
    version: 1,
    source: "ga4",
    propertyId: "",
    syncedAt: "",
    startDate: "",
    endDate: "",
    status: "not_configured",
    message: "GA4 is not configured.",
    rows: []
  });
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const accessToken = process.env.GA4_ACCESS_TOKEN?.trim();
  const defaults = defaultDateRange();
  const startDate = process.env.ANALYTICS_START_DATE?.trim() || defaults.startDate;
  const endDate = process.env.ANALYTICS_END_DATE?.trim() || defaults.endDate;

  if (!propertyId || !accessToken) {
    return {
      ...existing,
      propertyId: propertyId || existing.propertyId,
      startDate: existing.startDate || startDate,
      endDate: existing.endDate || endDate,
      status: "not_configured",
      message: "Set GA4_PROPERTY_ID and GA4_ACCESS_TOKEN to refresh pageviews."
    };
  }

  try {
    const rows = await fetchGa4Traffic(
      propertyId.replace(/^properties\//, ""),
      accessToken,
      startDate,
      endDate
    );
    return {
      version: 1,
      source: "ga4",
      propertyId,
      syncedAt: new Date().toISOString(),
      startDate,
      endDate,
      status: "connected",
      message: `Synced ${rows.length} GA4 rows.`,
      rows
    };
  } catch (error) {
    return {
      ...existing,
      propertyId,
      startDate: existing.startDate || startDate,
      endDate: existing.endDate || endDate,
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function readGuides(reviewReport: ReviewReport) {
  const reviewMap = new Map(
    (reviewReport.guides ?? []).map((review) => [review.slug, review])
  );
  if (!fs.existsSync(guidesDirectory)) return [];

  return fs
    .readdirSync(guidesDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map<GuideRecord>((file) => {
      const parsed = matter(
        fs.readFileSync(path.join(guidesDirectory, file), "utf8")
      );
      const slug = String(parsed.data.slug || file.replace(/\.mdx$/, ""));
      const review = reviewMap.get(slug);
      return {
        slug,
        title: String(parsed.data.title || slug),
        game: String(parsed.data.game || "unknown-game"),
        category: String(parsed.data.category || "uncategorized"),
        updatedDate: String(
          parsed.data.updatedDate ||
            parsed.data.updated ||
            parsed.data.publishDate ||
            parsed.data.date ||
            ""
        ),
        needsUpdate:
          parsed.data.needsUpdate === true || parsed.data.needsUpdate === "true",
        needsRewrite:
          review?.needsRewrite ??
          (parsed.data.needsRewrite === true ||
            parsed.data.needsRewrite === "true"),
        seoScore: Number(review?.seoScore ?? parsed.data.seoScore ?? 0)
      };
    });
}

function matchesGuide(page: string, slug: string) {
  const guidePath = `/guides/${slug}`;
  try {
    return new URL(page, "https://example.com").pathname.replace(/\/+$/, "") === guidePath;
  } catch {
    return page.replace(/\/+$/, "") === guidePath;
  }
}

function splitPeriod<T>(
  rows: T[],
  date: (row: T) => string
): { previous: T[]; current: T[] } {
  const timestamps = rows
    .map((row) => Number(new Date(`${date(row)}T00:00:00Z`)))
    .filter(Number.isFinite);
  if (timestamps.length < 2) return { previous: [], current: rows };
  const first = Math.min(...timestamps);
  const last = Math.max(...timestamps);
  const midpoint = first + (last - first) / 2;
  return {
    previous: rows.filter(
      (row) => Number(new Date(`${date(row)}T00:00:00Z`)) <= midpoint
    ),
    current: rows.filter(
      (row) => Number(new Date(`${date(row)}T00:00:00Z`)) > midpoint
    )
  };
}

function sum<T>(rows: T[], value: (row: T) => number) {
  return rows.reduce((total, row) => total + value(row), 0);
}

function guideTraffic(rows: TrafficRow[], slug: string) {
  const matched = rows.filter((row) => matchesGuide(row.page, slug));
  const periods = splitPeriod(matched, (row) => row.date);
  const previous = sum(periods.previous, (row) => row.pageviews);
  const current = sum(periods.current, (row) => row.pageviews);
  return {
    pageviews: sum(matched, (row) => row.pageviews),
    previous,
    current,
    change: current - previous
  };
}

function guideSearch(rows: SearchConsoleRow[], slug: string) {
  const matched = rows.filter((row) => matchesGuide(row.page, slug));
  const periods = splitPeriod(matched, (row) => row.date);
  const clicks = sum(matched, (row) => row.clicks);
  const impressions = sum(matched, (row) => row.impressions);
  const previous = sum(periods.previous, (row) => row.clicks);
  const current = sum(periods.current, (row) => row.clicks);
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    previous,
    current,
    change: current - previous
  };
}

function recommendationFor(
  guide: GuideRecord,
  metrics: {
    pageviews: number;
    clicks: number;
    impressions: number;
    ctr: number;
    revenue: number;
  },
  analyticsConnected: boolean
): { recommendation: AnalyticsRecommendation | null; reason: string } {
  const age = guide.updatedDate
    ? Math.max(0, (Date.now() - Number(new Date(guide.updatedDate))) / 86_400_000)
    : Number.POSITIVE_INFINITY;

  if (guide.needsUpdate) {
    return {
      recommendation: "UPDATE",
      reason: "Patch or freshness review is required."
    };
  }
  if (
    analyticsConnected &&
    age >= 180 &&
    metrics.pageviews === 0 &&
    metrics.clicks === 0 &&
    guide.seoScore < 75
  ) {
    return {
      recommendation: "DELETE",
      reason: "No measured traffic for an older, low-scoring page. Review manually before any action."
    };
  }
  if (
    guide.needsRewrite ||
    (guide.seoScore < 90 && metrics.impressions >= 50 && metrics.ctr < 0.02)
  ) {
    return {
      recommendation: "REWRITE",
      reason: "Content review failed or search engagement is below its opportunity."
    };
  }
  if (
    metrics.pageviews >= 250 ||
    metrics.impressions >= 500 ||
    metrics.revenue >= 5
  ) {
    return {
      recommendation: "EXPAND",
      reason: "Existing demand or revenue supports deeper coverage and internal links."
    };
  }
  return { recommendation: null, reason: "No immediate business action." };
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

async function main() {
  const traffic = await syncTraffic();
  writeJsonAtomic(trafficPath, traffic);

  const searchConsole = readJson<SearchConsoleDataset>(searchConsolePath, {
    version: 1,
    siteUrl: "",
    syncedAt: "",
    startDate: "",
    endDate: "",
    rows: []
  });
  const affiliateReport = readJson<AffiliateReport>(affiliateReportPath, {
    version: 1,
    generatedAt: "",
    summary: {
      affiliateClicks: 0,
      estimatedRevenue: 0,
      guidesWithOffers: 0
    },
    pages: []
  });
  const affiliateClicks = readJson<AffiliateClicks>(affiliateClicksPath, {
    pages: {}
  });
  const reviews = readJson<ReviewReport>(reviewPath, {});
  const affiliateMap = new Map(
    affiliateReport.pages.map((page) => [page.slug, page])
  );
  const pages = readGuides(reviews).map<GuidePerformance>((guide) => {
    const ga4 = guideTraffic(traffic.rows, guide.slug);
    const search = guideSearch(searchConsole.rows, guide.slug);
    const affiliate = affiliateMap.get(guide.slug);
    const clicks = Math.max(
      0,
      Number(
        affiliateClicks.pages?.[guide.slug] ?? affiliate?.affiliateClicks ?? 0
      )
    );
    const estimatedEpc = Number(affiliate?.estimatedEpc ?? 0);
    const revenue = roundMoney(clicks * estimatedEpc);
    const recommendation = recommendationFor(
      guide,
      {
        pageviews: ga4.pageviews,
        clicks: search.clicks,
        impressions: search.impressions,
        ctr: search.ctr,
        revenue
      },
      traffic.status === "connected"
    );

    return {
      slug: guide.slug,
      title: guide.title,
      game: guide.game,
      category: guide.category,
      updatedDate: guide.updatedDate,
      seoScore: guide.seoScore,
      pageviews: ga4.pageviews,
      previousPageviews: ga4.previous,
      currentPageviews: ga4.current,
      pageviewChange: ga4.change,
      clicks: search.clicks,
      impressions: search.impressions,
      ctr: search.ctr,
      previousClicks: search.previous,
      currentClicks: search.current,
      clickChange: search.change,
      trafficChange: ga4.change + search.change,
      affiliateClicks: clicks,
      estimatedRevenue: revenue,
      revenuePer1000Views: ga4.pageviews
        ? roundMoney((revenue / ga4.pageviews) * 1000)
        : 0,
      revenuePerVisit: ga4.pageviews
        ? Number((revenue / ga4.pageviews).toFixed(4))
        : 0,
      recommendation: recommendation.recommendation,
      recommendationReason: recommendation.reason
    };
  });

  const pageviews = sum(pages, (page) => page.pageviews);
  const clicks = sum(pages, (page) => page.clicks);
  const impressions = sum(pages, (page) => page.impressions);
  const totalAffiliateClicks = sum(pages, (page) => page.affiliateClicks);
  const estimatedRevenue = roundMoney(
    sum(pages, (page) => page.estimatedRevenue)
  );
  const estimatedRpm = pageviews
    ? roundMoney((estimatedRevenue / pageviews) * 1000)
    : 0;
  const generatedAt = new Date().toISOString();
  const performance: PagePerformanceDataset = {
    version: 1,
    generatedAt,
    recommendationOnly: true,
    summary: {
      guides: pages.length,
      pageviews,
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      affiliateClicks: totalAffiliateClicks,
      estimatedRevenue,
      estimatedRpm,
      recommendations: pages.filter((page) => page.recommendation).length
    },
    pages: pages.sort(
      (left, right) =>
        right.estimatedRevenue - left.estimatedRevenue ||
        right.pageviews - left.pageviews ||
        left.title.localeCompare(right.title)
    )
  };
  const revenue: RevenueDataset = {
    version: 1,
    generatedAt,
    currency: "USD",
    summary: {
      affiliateClicks: totalAffiliateClicks,
      estimatedRevenue,
      pageviews,
      estimatedRpm
    },
    pages: pages
      .map((page) => ({
        slug: page.slug,
        title: page.title,
        affiliateClicks: page.affiliateClicks,
        estimatedRevenue: page.estimatedRevenue,
        pageviews: page.pageviews,
        revenuePer1000Views: page.revenuePer1000Views,
        revenuePerVisit: page.revenuePerVisit
      }))
      .sort(
        (left, right) =>
          right.estimatedRevenue - left.estimatedRevenue ||
          right.revenuePerVisit - left.revenuePerVisit
      )
  };
  writeJsonAtomic(performancePath, performance);
  writeJsonAtomic(revenuePath, revenue);

  console.log(traffic.message);
  console.log(
    `Analytics synced: ${pages.length} guides, ${pageviews} pageviews, ${clicks} organic clicks, $${estimatedRevenue.toFixed(2)} estimated revenue.`
  );
  console.log(
    `${performance.summary.recommendations} recommendation(s) marked; no pages were deleted.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
