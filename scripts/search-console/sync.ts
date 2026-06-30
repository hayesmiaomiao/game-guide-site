import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fetchSearchConsoleData } from "./fetch";
import type { SearchConsoleDataset } from "../../lib/search-console/types";

const outputPath = path.join(process.cwd(), "data", "search-console.json");

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

async function sync() {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim();
  const accessToken = process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN?.trim();
  const defaults = defaultDateRange();
  const startDate = process.env.GSC_START_DATE?.trim() || defaults.startDate;
  const endDate = process.env.GSC_END_DATE?.trim() || defaults.endDate;

  if (!siteUrl) {
    throw new Error("GOOGLE_SEARCH_CONSOLE_SITE_URL is not configured in .env.");
  }
  if (!accessToken) {
    throw new Error(
      "GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN is not configured in .env."
    );
  }

  console.log(`Syncing Search Console data for ${startDate} through ${endDate}...`);
  const rows = await fetchSearchConsoleData({
    siteUrl,
    accessToken,
    startDate,
    endDate
  });
  const dataset: SearchConsoleDataset = {
    version: 1,
    siteUrl,
    syncedAt: new Date().toISOString(),
    startDate,
    endDate,
    rows
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, outputPath);
  console.log(`Saved ${rows.length} rows to ${path.relative(process.cwd(), outputPath)}.`);
}

sync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
