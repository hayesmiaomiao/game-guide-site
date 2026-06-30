import fs from "node:fs";
import path from "node:path";

export type AffiliatePageReport = {
  slug: string;
  title: string;
  game: string;
  category: string;
  affiliateClicks: number;
  estimatedRevenue: number;
  estimatedEpc?: number;
  recommendationCount: number;
  providers: string[];
};

export type AffiliateReport = {
  version: 1;
  generatedAt: string;
  summary: {
    affiliateClicks: number;
    estimatedRevenue: number;
    guidesWithOffers: number;
  };
  pages: AffiliatePageReport[];
};

export const emptyAffiliateReport: AffiliateReport = {
  version: 1,
  generatedAt: "",
  summary: {
    affiliateClicks: 0,
    estimatedRevenue: 0,
    guidesWithOffers: 0
  },
  pages: []
};

const reportPath = path.join(process.cwd(), "data", "affiliate-report.json");

export function readAffiliateReport(): AffiliateReport {
  if (!fs.existsSync(reportPath)) return emptyAffiliateReport;

  try {
    const value = JSON.parse(
      fs.readFileSync(reportPath, "utf8")
    ) as AffiliateReport;
    if (!Array.isArray(value.pages)) {
      throw new Error("pages must be an array");
    }
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read data/affiliate-report.json: ${message}`);
  }
}
