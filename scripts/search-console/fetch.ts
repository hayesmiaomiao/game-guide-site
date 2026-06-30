import "dotenv/config";
import { pathToFileURL } from "node:url";
import type {
  SearchConsoleFetchOptions,
  SearchConsoleRow
} from "../../lib/search-console/types";

const API_ROOT = "https://www.googleapis.com/webmasters/v3";
const PAGE_SIZE = 25_000;

type ApiRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type ApiResponse = {
  rows?: ApiRow[];
};

export async function fetchSearchConsoleData({
  siteUrl,
  accessToken,
  startDate,
  endDate
}: SearchConsoleFetchOptions): Promise<SearchConsoleRow[]> {
  const rows: SearchConsoleRow[] = [];
  let startRow = 0;

  while (true) {
    const response = await fetch(
      `${API_ROOT}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["date", "query", "page"],
          dataState: "final",
          rowLimit: PAGE_SIZE,
          startRow
        })
      }
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Search Console API returned ${response.status} ${response.statusText}: ${details}`
      );
    }

    const payload = (await response.json()) as ApiResponse;
    const pageRows = payload.rows ?? [];

    rows.push(
      ...pageRows.map((row) => ({
        date: row.keys?.[0] ?? "",
        query: row.keys?.[1] ?? "",
        page: row.keys?.[2] ?? "",
        clicks: Number(row.clicks ?? 0),
        impressions: Number(row.impressions ?? 0),
        ctr: Number(row.ctr ?? 0),
        position: Number(row.position ?? 0)
      }))
    );

    if (pageRows.length < PAGE_SIZE) break;
    startRow += PAGE_SIZE;
  }

  return rows;
}

async function run() {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim();
  const accessToken = process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN?.trim();
  const startDate = process.env.GSC_START_DATE?.trim();
  const endDate = process.env.GSC_END_DATE?.trim();

  if (!siteUrl || !accessToken || !startDate || !endDate) {
    throw new Error(
      "Set GOOGLE_SEARCH_CONSOLE_SITE_URL, GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN, GSC_START_DATE, and GSC_END_DATE before fetching."
    );
  }

  const rows = await fetchSearchConsoleData({
    siteUrl,
    accessToken,
    startDate,
    endDate
  });
  console.log(`Fetched ${rows.length} Search Console rows.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
