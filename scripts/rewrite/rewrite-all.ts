import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import matter from "gray-matter";
import { spawnSync } from "node:child_process";
import { rewriteGuide } from "./rewrite-guide";

const projectRoot = process.cwd();
const reportPath = path.join(projectRoot, "review-report.json");
const guidesDirectory = path.join(projectRoot, "content", "guides");
const tsxCli = path.join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");

type ReportGuide = {
  slug: string;
  seoScore: number;
  needsRewrite: boolean;
  topProblems: string[];
  duplicateWith?: string;
};

type ReviewReport = {
  guides: ReportGuide[];
};

function runCommand(label: string, args: string[]) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false
  });

  if (result.error) {
    throw new Error(`${label} could not start: ${result.error.message}`);
  }
  if (result.signal) {
    throw new Error(`${label} was terminated by ${result.signal}.`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} exited with code ${result.status}.`);
  }
}

function runReview() {
  runCommand("Review guides", [tsxCli, "scripts/review/review-all.ts"]);
}

function runToc() {
  runCommand("Regenerate TOC", ["scripts/toc.js"]);
}

function readReport(): ReviewReport {
  if (!fs.existsSync(reportPath)) {
    throw new Error("review-report.json does not exist. Run npm run review first.");
  }
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as ReviewReport;
  if (!Array.isArray(report.guides)) {
    throw new Error("review-report.json has an invalid format.");
  }
  return report;
}

function findGuideFile(slug: string) {
  for (const file of fs.readdirSync(guidesDirectory)) {
    if (!file.endsWith(".mdx")) continue;
    const filePath = path.join(guidesDirectory, file);
    const source = fs.readFileSync(filePath, "utf8");
    const parsed = matter(source);
    if (String(parsed.data.slug || file.replace(/\.mdx$/, "")) === slug) {
      return { filePath, source };
    }
  }
  return undefined;
}

async function rewritePass(pass: number, pending: ReportGuide[]) {
  console.log(`\n=== Rewrite pass ${pass}: ${pending.length} guide(s) ===`);

  for (let index = 0; index < pending.length; index += 1) {
    const review = pending[index];
    const guide = findGuideFile(review.slug);
    if (!guide) {
      throw new Error(`No MDX guide found for "${review.slug}".`);
    }

    console.log(
      `[${index + 1}/${pending.length}] Rewriting ${review.slug} (score ${review.seoScore})`
    );
    const rewritten = await rewriteGuide({
      source: guide.source,
      review: {
        seoScore: review.seoScore,
        topProblems: review.topProblems,
        duplicateWith: review.duplicateWith
      }
    });
    fs.writeFileSync(guide.filePath, rewritten, "utf8");
    console.log(`Saved: ${path.relative(projectRoot, guide.filePath)}`);
  }
}

async function main() {
  try {
    const maxPasses = Math.max(
      1,
      Number.parseInt(process.env.REWRITE_MAX_PASSES || "3", 10) || 3
    );

    runReview();

    for (let pass = 1; pass <= maxPasses; pass += 1) {
      const pending = readReport().guides.filter((guide) => guide.needsRewrite);
      if (!pending.length) {
        console.log("All guides have an SEO score of 90 or higher.");
        return;
      }

      await rewritePass(pass, pending);
      runToc();
      runReview();
    }

    const remaining = readReport().guides.filter((guide) => guide.needsRewrite);
    if (remaining.length) {
      throw new Error(
        `${remaining.length} guide(s) remain below 90 after ${maxPasses} passes: ${remaining
          .map((guide) => `${guide.slug} (${guide.seoScore})`)
          .join(", ")}`
      );
    }
  } catch (error) {
    const details = error as Error & {
      status?: number;
      code?: string;
    };
    console.error(
      `Rewrite failed: ${details.name || "Error"}: ${details.message || String(error)}`
    );
    if (details.status) console.error(`status=${details.status}`);
    if (details.code) console.error(`code=${details.code}`);
    process.exitCode = 1;
  }
}

void main();
