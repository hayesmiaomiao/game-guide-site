import fs from "node:fs";
import path from "node:path";

export type AnalyticsRecommendation =
  | "UPDATE"
  | "REWRITE"
  | "DELETE"
  | "EXPAND";

export type GuidePerformance = {
  slug: string;
  title: string;
  game: string;
  category: string;
  updatedDate: string;
  seoScore: number;
  pageviews: number;
  previousPageviews: number;
  currentPageviews: number;
  pageviewChange: number;
  clicks: number;
  impressions: number;
  ctr: number;
  previousClicks: number;
  currentClicks: number;
  clickChange: number;
  trafficChange: number;
  affiliateClicks: number;
  estimatedRevenue: number;
  revenuePer1000Views: number;
  revenuePerVisit: number;
  recommendation: AnalyticsRecommendation | null;
  recommendationReason: string;
};

export type PagePerformanceDataset = {
  version: 1;
  generatedAt: string;
  recommendationOnly: true;
  summary: {
    guides: number;
    pageviews: number;
    clicks: number;
    impressions: number;
    ctr: number;
    affiliateClicks: number;
    estimatedRevenue: number;
    estimatedRpm: number;
    recommendations: number;
  };
  pages: GuidePerformance[];
};

export type TrafficRow = {
  date: string;
  page: string;
  pageviews: number;
};

export type TrafficDataset = {
  version: 1;
  source: "ga4";
  propertyId: string;
  syncedAt: string;
  startDate: string;
  endDate: string;
  status: "connected" | "not_configured" | "error";
  message: string;
  rows: TrafficRow[];
};

export type RevenueDataset = {
  version: 1;
  generatedAt: string;
  currency: "USD";
  summary: {
    affiliateClicks: number;
    estimatedRevenue: number;
    pageviews: number;
    estimatedRpm: number;
  };
  pages: Array<{
    slug: string;
    title: string;
    affiliateClicks: number;
    estimatedRevenue: number;
    pageviews: number;
    revenuePer1000Views: number;
    revenuePerVisit: number;
  }>;
};

export const emptyPagePerformance: PagePerformanceDataset = {
  version: 1,
  generatedAt: "",
  recommendationOnly: true,
  summary: {
    guides: 0,
    pageviews: 0,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    affiliateClicks: 0,
    estimatedRevenue: 0,
    estimatedRpm: 0,
    recommendations: 0
  },
  pages: []
};

const performancePath = path.join(
  process.cwd(),
  "data",
  "analytics",
  "page-performance.json"
);

export function readPagePerformance(): PagePerformanceDataset {
  if (!fs.existsSync(performancePath)) return emptyPagePerformance;
  try {
    const value = JSON.parse(
      fs.readFileSync(performancePath, "utf8")
    ) as PagePerformanceDataset;
    if (!Array.isArray(value.pages)) throw new Error("pages must be an array");
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read data/analytics/page-performance.json: ${message}`);
  }
}
