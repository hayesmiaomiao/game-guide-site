import fs from "node:fs";
import path from "node:path";

export type TrendSource =
  | "google-trends"
  | "steam-top-sellers"
  | "steam-most-played"
  | "steam-upcoming"
  | "reddit-gaming"
  | "youtube-gaming"
  | "search-console-winners"
  | "keyword-backlog";

export type TrendOpportunity = {
  id: string;
  title: string;
  game: string;
  category: string;
  score: number;
  source: TrendSource;
  difficulty: string;
  searchIntent: string;
  commercialIntent: "High" | "Medium" | "Low";
  publishSuggestion: string;
  popularity: number;
  competition: number;
  freshness: number;
  commercialValue: number;
  existingCoverage: number;
  alreadyCovered: boolean;
  inBacklog: boolean;
  ignored: boolean;
  todoSource: string;
};

export type TrendReport = {
  version: 1;
  generatedAt: string;
  summary: {
    total: number;
    actionable: number;
    alreadyCovered: number;
    inBacklog: number;
    averageScore: number;
  };
  sourceStatus: Array<{
    source: TrendSource;
    status: "ok" | "skipped" | "failed";
    count: number;
    message: string;
  }>;
  opportunities: TrendOpportunity[];
};

export const emptyTrendReport: TrendReport = {
  version: 1,
  generatedAt: "",
  summary: {
    total: 0,
    actionable: 0,
    alreadyCovered: 0,
    inBacklog: 0,
    averageScore: 0
  },
  sourceStatus: [],
  opportunities: []
};

const reportPath = path.join(
  process.cwd(),
  "data",
  "trends",
  "trend-report.json"
);

export function readTrendReport(): TrendReport {
  if (!fs.existsSync(reportPath)) return emptyTrendReport;
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as TrendReport;
    if (!Array.isArray(report.opportunities)) {
      throw new Error("opportunities must be an array");
    }
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read data/trends/trend-report.json: ${message}`);
  }
}
