const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const projectRoot = path.resolve(__dirname, "..");
const guidesDirectory = path.join(projectRoot, "content", "guides");
const relatedSectionPattern =
  /\r?\n(?:---\r?\n\r?\n)?## Related Guides\r?\n[\s\S]*$/;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function keywordTokens(value) {
  const ignored = new Set([
    "a",
    "an",
    "and",
    "best",
    "for",
    "guide",
    "in",
    "of",
    "the",
    "to"
  ]);

  return new Set(
    String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !ignored.has(token))
  );
}

function readGuides() {
  if (!fs.existsSync(guidesDirectory)) {
    throw new Error("content/guides directory does not exist.");
  }

  return fs
    .readdirSync(guidesDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => {
      const filePath = path.join(guidesDirectory, file);
      const source = fs.readFileSync(filePath, "utf8");
      const { data } = matter(source);
      const missing = ["game", "category", "title"].filter(
        (field) => !data[field]
      );

      if (missing.length) {
        throw new Error(
          `${path.relative(projectRoot, filePath)} is missing: ${missing.join(", ")}`
        );
      }

      return {
        file,
        filePath,
        source,
        game: slugify(data.game),
        category: slugify(data.category),
        title: String(data.title),
        slug: slugify(data.slug || file.replace(/\.mdx$/, "")),
        keyword: String(data.keyword || data.title)
      };
    });
}

function relevanceScore(source, candidate) {
  const sourceTokens = keywordTokens(source.keyword);
  const candidateTokens = keywordTokens(candidate.keyword);
  let score = 0;

  for (const token of sourceTokens) {
    if (candidateTokens.has(token)) score += 1;
  }

  return score;
}

function recommendGuides(source, guides) {
  return guides
    .filter(
      (candidate) =>
        candidate.slug !== source.slug && candidate.game === source.game
    )
    .sort((left, right) => {
      const leftCategoryRank = left.category === source.category ? 0 : 1;
      const rightCategoryRank = right.category === source.category ? 0 : 1;

      return (
        leftCategoryRank - rightCategoryRank ||
        relevanceScore(source, right) - relevanceScore(source, left) ||
        left.title.localeCompare(right.title)
      );
    })
    .slice(0, 6);
}

function escapeLinkText(value) {
  return value.replace(/([\[\]])/g, "\\$1");
}

function buildRelatedSection(recommendations) {
  if (!recommendations.length) return "";

  const links = recommendations
    .map(
      (guide) =>
        `- [${escapeLinkText(guide.title)}](/guides/${guide.slug})`
    )
    .join("\n");

  return `\n\n---\n\n## Related Guides\n\n${links}\n`;
}

function updateGuide(source, recommendations) {
  const withoutExistingSection = source.source
    .replace(relatedSectionPattern, "")
    .trimEnd();
  const nextSource = `${withoutExistingSection}${buildRelatedSection(
    recommendations
  )}`;

  if (nextSource === source.source) return false;

  fs.writeFileSync(source.filePath, nextSource, "utf8");
  return true;
}

function main() {
  try {
    const guides = readGuides();
    let updated = 0;

    for (const guide of guides) {
      const recommendations = recommendGuides(guide, guides);
      if (updateGuide(guide, recommendations)) {
        updated += 1;
        console.log(
          `Updated ${path.relative(projectRoot, guide.filePath)} with ${recommendations.length} related guide(s).`
        );
      }
    }

    console.log(
      `Internal links complete: ${guides.length} guide(s) scanned, ${updated} file(s) updated.`
    );
  } catch (error) {
    console.error(
      `Internal links failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  }
}

main();
