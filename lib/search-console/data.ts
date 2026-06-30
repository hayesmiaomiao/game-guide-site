import fs from "node:fs";
import path from "node:path";
import type {
  SearchConsoleDataset,
  SearchConsoleRow
} from "@/lib/search-console/types";

export const searchConsoleDataPath = path.join(
  process.cwd(),
  "data",
  "search-console.json"
);

export const emptySearchConsoleDataset: SearchConsoleDataset = {
  version: 1,
  siteUrl: "",
  syncedAt: "",
  startDate: "",
  endDate: "",
  rows: []
};

function isRow(value: unknown): value is SearchConsoleRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;

  return (
    typeof row.date === "string" &&
    typeof row.query === "string" &&
    typeof row.page === "string" &&
    typeof row.clicks === "number" &&
    typeof row.impressions === "number" &&
    typeof row.ctr === "number" &&
    typeof row.position === "number"
  );
}

export function readSearchConsoleData(): SearchConsoleDataset {
  if (!fs.existsSync(searchConsoleDataPath)) {
    return emptySearchConsoleDataset;
  }

  try {
    const value = JSON.parse(
      fs.readFileSync(searchConsoleDataPath, "utf8")
    ) as Partial<SearchConsoleDataset>;

    return {
      version: 1,
      siteUrl: typeof value.siteUrl === "string" ? value.siteUrl : "",
      syncedAt: typeof value.syncedAt === "string" ? value.syncedAt : "",
      startDate: typeof value.startDate === "string" ? value.startDate : "",
      endDate: typeof value.endDate === "string" ? value.endDate : "",
      rows: Array.isArray(value.rows) ? value.rows.filter(isRow) : []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read data/search-console.json: ${message}`);
  }
}
