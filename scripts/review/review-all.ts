import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { reviewGuide, type GuideReview } from "./review-guide";

const projectRoot = process.cwd();
const guidesDirectory = path.join(projectRoot, "content", "guides");
const publicDirectory = path.join(projectRoot, "public");
const reportPath = path.join(projectRoot, "review-report.json");

type GuideDocument = {
  filePath: string;
  source: string;
  data: Record<string, unknown>;
  content: string;
  slug: string;
  shingles: Set<string>;
};

function today() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function normalizeWords(content: string) {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/[^a-z0-9\s]/gi, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function buildShingles(content: string, size = 5) {
  const words = normalizeWords(content);
  const shingles = new Set<string>();

  for (let index = 0; index <= words.length - size; index += 1) {
    shingles.add(words.slice(index, index + size).join(" "));
  }
  return shingles;
}

function similarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;

  let intersection = 0;
  for (const shingle of Array.from(left)) {
    if (right.has(shingle)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
}

function readGuides(): GuideDocument[] {
  return fs
    .readdirSync(guidesDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => {
      const filePath = path.join(guidesDirectory, file);
      const source = fs.readFileSync(filePath, "utf8");
      const parsed = matter(source);
      const slug = String(parsed.data.slug || file.replace(/\.mdx$/, ""));

      return {
        filePath,
        source,
        data: parsed.data,
        content: parsed.content,
        slug,
        shingles: buildShingles(parsed.content)
      };
    });
}

function findHighestSimilarity(guide: GuideDocument, guides: GuideDocument[]) {
  let highest = 0;
  let duplicateWith: string | undefined;

  for (const candidate of guides) {
    if (candidate.slug === guide.slug) continue;
    const score = similarity(guide.shingles, candidate.shingles);
    if (score > highest) {
      highest = score;
      duplicateWith = candidate.slug;
    }
  }

  return { highest, duplicateWith };
}

function imageFileExists(data: Record<string, unknown>) {
  const image =
    (typeof data.image === "string" && data.image) ||
    (typeof data.heroImage === "string" && data.heroImage) ||
    "";
  if (!image.startsWith("/images/")) return false;

  const filePath = path.resolve(publicDirectory, image.replace(/^\/+/, ""));
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`)) return false;
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function updateFrontmatterField(
  source: string,
  field: string,
  yamlValue: string
) {
  const boundary = /^(---\r?\n)([\s\S]*?)(\r?\n---)/.exec(source);
  if (!boundary) throw new Error("Guide does not contain valid frontmatter.");

  const pattern = new RegExp(`^${field}:.*$`, "m");
  const replacement = `${field}: ${yamlValue}`;
  const frontmatter = pattern.test(boundary[2])
    ? boundary[2].replace(pattern, replacement)
    : `${boundary[2].trimEnd()}\n${replacement}`;

  return `${boundary[1]}${frontmatter}${source.slice(boundary[1].length + boundary[2].length)}`;
}

function writeReviewToGuide(guide: GuideDocument, review: GuideReview) {
  let nextSource = updateFrontmatterField(
    guide.source,
    "seoScore",
    String(review.seoScore)
  );
  nextSource = updateFrontmatterField(
    nextSource,
    "reviewStatus",
    JSON.stringify(review.reviewStatus)
  );
  nextSource = updateFrontmatterField(
    nextSource,
    "needsRewrite",
    String(review.needsRewrite)
  );
  nextSource = updateFrontmatterField(
    nextSource,
    "topProblems",
    JSON.stringify(review.topProblems)
  );
  nextSource = updateFrontmatterField(
    nextSource,
    "reviewedAt",
    JSON.stringify(today())
  );

  if (nextSource === guide.source) return false;
  fs.writeFileSync(guide.filePath, nextSource, "utf8");
  return true;
}

function main() {
  try {
    if (!fs.existsSync(guidesDirectory)) {
      throw new Error("content/guides directory does not exist.");
    }

    const guides = readGuides();
    const reviews: GuideReview[] = [];
    let updated = 0;

    for (const guide of guides) {
      const duplicate = findHighestSimilarity(guide, guides);
      const review = reviewGuide({
        data: guide.data,
        content: guide.content,
        fileExists: imageFileExists(guide.data),
        duplicateSimilarity: duplicate.highest,
        duplicateWith: duplicate.duplicateWith
      });
      reviews.push(review);
      if (writeReviewToGuide(guide, review)) updated += 1;

      console.log(
        `${review.seoScore.toString().padStart(3, " ")} ${review.reviewStatus.padEnd(13)} ${review.slug}`
      );
    }

    const approved = reviews.filter((review) => !review.needsRewrite).length;
    const averageScore = reviews.length
      ? Math.round(
          reviews.reduce((total, review) => total + review.seoScore, 0) /
            reviews.length
        )
      : 0;
    const report = {
      version: 1,
      generatedAt: today(),
      summary: {
        totalGuides: reviews.length,
        approved,
        needsRewrite: reviews.length - approved,
        averageScore
      },
      guides: reviews
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(
      `Review complete: ${reviews.length} guide(s), ${approved} approved, ${reviews.length - approved} need rewrite, average score ${averageScore}.`
    );
    console.log(`Updated ${updated} MDX file(s). Report: review-report.json`);
  } catch (error) {
    console.error(
      `Review failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

main();
