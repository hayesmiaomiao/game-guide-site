import fs from "node:fs";
import path from "node:path";

export type GrowthAction = "WRITE" | "UPDATE" | "REWRITE" | "IGNORE";
export type RevenueImpact = "High" | "Medium" | "Low";

export type GrowthTask = {
  id: string;
  kind: "guide" | "keyword";
  slug: string;
  title: string;
  game: string;
  category: string;
  action: GrowthAction;
  priorityScore: number;
  seoScore: number;
  trafficScore: number;
  ctrScore: number;
  freshnessScore: number;
  revenueScore: number;
  reason: string;
  estimatedTrafficGain: number;
  estimatedRevenueImpact: RevenueImpact;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  positionChange: number;
  needsUpdate: boolean;
  needsRewrite: boolean;
};

export type GrowthPlan = {
  version: 1;
  generatedAt: string;
  inputStatus: {
    reviewGeneratedAt: string;
    searchConsoleSyncedAt: string;
    searchConsoleRows: number;
    patchFiles: number;
    pendingKeywords: number;
  };
  summary: {
    todaysWork: number;
    highestOpportunity: string;
    highestOpportunityScore: number;
    pagesLosingRanking: number;
    pagesWithLowCtr: number;
    highPotentialKeywords: number;
  };
  guides: GrowthTask[];
  tasks: GrowthTask[];
};

export const emptyGrowthPlan: GrowthPlan = {
  version: 1,
  generatedAt: "",
  inputStatus: {
    reviewGeneratedAt: "",
    searchConsoleSyncedAt: "",
    searchConsoleRows: 0,
    patchFiles: 0,
    pendingKeywords: 0
  },
  summary: {
    todaysWork: 0,
    highestOpportunity: "No growth plan generated",
    highestOpportunityScore: 0,
    pagesLosingRanking: 0,
    pagesWithLowCtr: 0,
    highPotentialKeywords: 0
  },
  guides: [],
  tasks: []
};

const growthPlanPath = path.join(process.cwd(), "data", "growth-plan.json");

export function readGrowthPlan(): GrowthPlan {
  if (!fs.existsSync(growthPlanPath)) return emptyGrowthPlan;

  try {
    const value = JSON.parse(fs.readFileSync(growthPlanPath, "utf8")) as GrowthPlan;
    if (!Array.isArray(value.guides) || !Array.isArray(value.tasks)) {
      throw new Error("guides and tasks must be arrays");
    }
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read data/growth-plan.json: ${message}`);
  }
}
