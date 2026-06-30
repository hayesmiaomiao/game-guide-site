import fs from "node:fs";
import path from "node:path";
import type { PagePerformanceDataset } from "../../lib/analytics";

const reportPath = path.join(
  process.cwd(),
  "data",
  "analytics",
  "page-performance.json"
);

function printPages(
  title: string,
  pages: PagePerformanceDataset["pages"],
  value: (page: PagePerformanceDataset["pages"][number]) => string
) {
  console.log(`\n${title}`);
  if (!pages.length) {
    console.log("No matching pages.");
    return;
  }
  for (const page of pages.slice(0, 10)) {
    console.log(`${value(page).padStart(12)}  ${page.title}`);
  }
}

function main() {
  if (!fs.existsSync(reportPath)) {
    throw new Error("Run npm run analytics:sync before generating a report.");
  }
  const data = JSON.parse(
    fs.readFileSync(reportPath, "utf8")
  ) as PagePerformanceDataset;
  console.log("Analytics & Revenue Report");
  console.log(`Generated: ${data.generatedAt || "Not generated"}`);
  console.log(`Guides: ${data.summary.guides}`);
  console.log(`Pageviews: ${data.summary.pageviews}`);
  console.log(`Organic clicks: ${data.summary.clicks}`);
  console.log(`CTR: ${(data.summary.ctr * 100).toFixed(2)}%`);
  console.log(`Affiliate clicks: ${data.summary.affiliateClicks}`);
  console.log(`Estimated revenue: $${data.summary.estimatedRevenue.toFixed(2)}`);
  console.log(`Estimated RPM: $${data.summary.estimatedRpm.toFixed(2)}`);
  console.log(`Recommendations: ${data.summary.recommendations}`);

  printPages(
    "Top Traffic Pages",
    [...data.pages].sort((left, right) => right.pageviews - left.pageviews),
    (page) => `${page.pageviews} views`
  );
  printPages(
    "Top Revenue Pages",
    [...data.pages].sort(
      (left, right) => right.estimatedRevenue - left.estimatedRevenue
    ),
    (page) => `$${page.estimatedRevenue.toFixed(2)}`
  );
  printPages(
    "Recommendations",
    data.pages.filter((page) => page.recommendation),
    (page) => page.recommendation || "-"
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
