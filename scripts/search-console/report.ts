import fs from "node:fs";
import path from "node:path";
import type {
  SearchConsoleDataset,
  SearchConsoleRow
} from "../../lib/search-console/types";

const dataPath = path.join(process.cwd(), "data", "search-console.json");

type Aggregate = {
  label: string;
  clicks: number;
  impressions: number;
  weightedPosition: number;
};

function aggregate(rows: SearchConsoleRow[], key: "page" | "query") {
  const values = new Map<string, Aggregate>();

  for (const row of rows) {
    const label = row[key] || "(not provided)";
    const current = values.get(label) ?? {
      label,
      clicks: 0,
      impressions: 0,
      weightedPosition: 0
    };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.weightedPosition += row.position * row.impressions;
    values.set(label, current);
  }

  return Array.from(values.values()).sort(
    (left, right) => right.clicks - left.clicks
  );
}

function printRows(title: string, rows: Aggregate[]) {
  console.log(`\n${title}`);
  for (const row of rows.slice(0, 10)) {
    const ctr = row.impressions ? row.clicks / row.impressions : 0;
    const position = row.impressions
      ? row.weightedPosition / row.impressions
      : 0;
    console.log(
      `${row.clicks.toFixed(0)} clicks | ${(ctr * 100).toFixed(1)}% CTR | ${position.toFixed(1)} position | ${row.label}`
    );
  }
}

function report() {
  if (!fs.existsSync(dataPath)) {
    throw new Error("data/search-console.json does not exist. Run search-console:sync.");
  }

  const dataset = JSON.parse(
    fs.readFileSync(dataPath, "utf8")
  ) as SearchConsoleDataset;
  const clicks = dataset.rows.reduce((total, row) => total + row.clicks, 0);
  const impressions = dataset.rows.reduce(
    (total, row) => total + row.impressions,
    0
  );
  const weightedPosition = dataset.rows.reduce(
    (total, row) => total + row.position * row.impressions,
    0
  );

  console.log("Search Console Report");
  console.log(`Site: ${dataset.siteUrl || "Not connected"}`);
  console.log(`Range: ${dataset.startDate || "-"} to ${dataset.endDate || "-"}`);
  console.log(`Rows: ${dataset.rows.length}`);
  console.log(`Clicks: ${clicks.toFixed(0)}`);
  console.log(`Impressions: ${impressions.toFixed(0)}`);
  console.log(`CTR: ${impressions ? ((clicks / impressions) * 100).toFixed(2) : "0.00"}%`);
  console.log(
    `Average position: ${impressions ? (weightedPosition / impressions).toFixed(2) : "0.00"}`
  );

  printRows("Top Pages", aggregate(dataset.rows, "page"));
  printRows("Top Queries", aggregate(dataset.rows, "query"));
}

try {
  report();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
