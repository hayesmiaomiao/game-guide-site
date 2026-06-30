const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const projectRoot = path.resolve(__dirname, "..");
const guidesDirectory = path.join(projectRoot, "content", "guides");
const affiliateDirectory = path.join(projectRoot, "content", "affiliate");
const clicksPath = path.join(projectRoot, "data", "affiliate-clicks.json");
const reportPath = path.join(projectRoot, "data", "affiliate-report.json");
const affiliateSectionPattern =
  /^## Recommended Products[ \t]*\r?\n[\s\S]*?(?=^##[ \t]+|^---[ \t]*$|(?![\s\S]))/m;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readProviders() {
  if (!fs.existsSync(affiliateDirectory)) {
    throw new Error("content/affiliate directory does not exist.");
  }

  return fs
    .readdirSync(affiliateDirectory)
    .filter((file) => file.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => {
      const config = readJson(path.join(affiliateDirectory, file), {});
      if (!config.provider || !Array.isArray(config.products)) {
        throw new Error(`${file} must define provider and products.`);
      }
      return config;
    });
}

function buildUrl(provider, product) {
  const url = new URL(product.url);
  if (provider.trackingId && provider.trackingParameter) {
    url.searchParams.set(provider.trackingParameter, provider.trackingId);
  }
  return url.toString();
}

function scoreProduct(guide, product) {
  const games = (product.games || []).map(slugify);
  const categories = (product.categories || []).map(slugify);
  const tags = new Set((product.tags || []).map(slugify));
  const exactGame = games.includes(guide.game);
  const wildcardGame = games.includes("");
  const exactCategory = categories.includes(guide.category);
  const wildcardCategory = categories.includes("");
  const tagMatches = guide.tags.filter((tag) => tags.has(tag)).length;

  if (!exactGame && !wildcardGame) return -1;
  if (!exactCategory && !wildcardCategory && tagMatches === 0) return -1;

  return (
    (exactGame ? 60 : 5) +
    (exactCategory ? 25 : wildcardCategory ? 3 : 0) +
    Math.min(tagMatches * 10, 30) +
    Number(product.priority || 0) / 10
  );
}

function recommendProducts(guide, providers) {
  return providers
    .map((provider) => {
      const products = provider.products
        .map((product) => ({
          provider,
          product,
          score: scoreProduct(guide, product)
        }))
        .filter((candidate) => candidate.score >= 0)
        .sort(
          (left, right) =>
            right.score - left.score ||
            String(left.product.name).localeCompare(String(right.product.name))
        );
      return products[0];
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((candidate) => ({
      provider: candidate.provider.provider,
      disclosure: candidate.provider.disclosure,
      name: String(candidate.product.name),
      description: String(candidate.product.description),
      url: buildUrl(candidate.provider, candidate.product),
      cta: String(candidate.product.cta || `View on ${candidate.provider.provider}`),
      estimatedEpc: Number(candidate.product.estimatedEpc || 0)
    }));
}

function escapeText(value) {
  return String(value).replace(/[<>]/g, "");
}

function buildAffiliateSection(recommendations) {
  if (!recommendations.length) return "";
  const products = recommendations
    .map(
      (item) =>
        `### ${escapeText(item.name)}\n\n${escapeText(item.description)}\n\n<a href="${item.url.replace(/"/g, "&quot;")}" rel="sponsored nofollow" data-affiliate-provider="${slugify(item.provider)}">${escapeText(item.cta)}</a>`
    )
    .join("\n\n");
  const providers = recommendations.map((item) => item.provider).join(", ");

  return `## Recommended Products\n\nThese optional recommendations match this guide's game and topic. Confirm platform, region, edition, and current price before purchasing.\n\n${products}\n\n*Affiliate disclosure: GameVault Guides may earn a commission from qualifying purchases through ${providers}, at no additional cost to you.*\n`;
}

function updateBody(body, recommendations) {
  const cleanBody = body.replace(affiliateSectionPattern, "").trimEnd();
  const section = buildAffiliateSection(recommendations);
  if (!section) return cleanBody;

  const insertionIndex = cleanBody.search(
    /^## (?:Frequently Asked Questions|FAQ)[ \t]*$/m
  );
  if (insertionIndex >= 0) {
    return `${cleanBody.slice(0, insertionIndex).trimEnd()}\n\n${section}\n${cleanBody
      .slice(insertionIndex)
      .trimStart()}`;
  }

  const relatedIndex = cleanBody.search(
    /(?:\r?\n)?---\r?\n\r?\n## Related Guides/m
  );
  if (relatedIndex >= 0) {
    return `${cleanBody.slice(0, relatedIndex).trimEnd()}\n\n${section}\n${cleanBody
      .slice(relatedIndex)
      .trimStart()}`;
  }

  return `${cleanBody}\n\n${section}`;
}

function readGuides() {
  return fs
    .readdirSync(guidesDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => {
      const filePath = path.join(guidesDirectory, file);
      const source = fs.readFileSync(filePath, "utf8");
      const parsed = matter(source);
      const parts = /^(---\r?\n[\s\S]*?\r?\n---)(\r?\n?)([\s\S]*)$/.exec(
        source
      );
      if (!parts) {
        throw new Error(
          `${path.relative(projectRoot, filePath)} does not contain valid frontmatter.`
        );
      }
      return {
        filePath,
        source,
        prefix: `${parts[1]}${parts[2] || "\n\n"}`,
        data: parsed.data,
        body: parts[3],
        slug: slugify(parsed.data.slug || file.replace(/\.mdx$/, "")),
        title: String(parsed.data.title || file.replace(/\.mdx$/, "")),
        game: slugify(parsed.data.game),
        category: slugify(parsed.data.category),
        tags: (parsed.data.tags || []).map(slugify)
      };
    });
}

function updateGuide(guide, recommendations) {
  const nextBody = updateBody(guide.body, recommendations).trimEnd();
  const nextSource = `${guide.prefix}${nextBody}\n`;
  if (nextSource.replace(/\r\n/g, "\n") === guide.source.replace(/\r\n/g, "\n")) {
    return false;
  }
  fs.writeFileSync(guide.filePath, nextSource, "utf8");
  return true;
}

function buildReport(guides, recommendationsBySlug) {
  const clicks = readJson(clicksPath, { pages: {} });
  const pages = guides.map((guide) => {
    const recommendations = recommendationsBySlug.get(guide.slug) || [];
    const affiliateClicks = Math.max(
      0,
      Number(clicks.pages?.[guide.slug] || 0)
    );
    const averageEpc = recommendations.length
      ? recommendations.reduce((sum, item) => sum + item.estimatedEpc, 0) /
        recommendations.length
      : 0;

    return {
      slug: guide.slug,
      title: guide.title,
      game: guide.game,
      category: guide.category,
      affiliateClicks,
      estimatedEpc: Number(averageEpc.toFixed(4)),
      estimatedRevenue: Number((affiliateClicks * averageEpc).toFixed(2)),
      recommendationCount: recommendations.length,
      providers: recommendations.map((item) => item.provider)
    };
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      affiliateClicks: pages.reduce(
        (sum, page) => sum + page.affiliateClicks,
        0
      ),
      estimatedRevenue: Number(
        pages
          .reduce((sum, page) => sum + page.estimatedRevenue, 0)
          .toFixed(2)
      ),
      guidesWithOffers: pages.filter((page) => page.recommendationCount > 0)
        .length
    },
    pages: pages.sort(
      (left, right) =>
        right.estimatedRevenue - left.estimatedRevenue ||
        right.affiliateClicks - left.affiliateClicks ||
        right.recommendationCount - left.recommendationCount ||
        left.title.localeCompare(right.title)
    )
  };
}

function main() {
  try {
    const providers = readProviders();
    const guides = readGuides();
    const recommendationsBySlug = new Map();
    let updated = 0;

    for (const guide of guides) {
      const recommendations = recommendProducts(guide, providers);
      recommendationsBySlug.set(guide.slug, recommendations);
      if (updateGuide(guide, recommendations)) {
        updated += 1;
        console.log(`Updated: ${path.relative(projectRoot, guide.filePath)}`);
      }
    }

    const report = buildReport(guides, recommendationsBySlug);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    const temporaryPath = `${reportPath}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, reportPath);

    console.log(
      `Affiliate engine complete: ${guides.length} guides scanned, ${updated} updated, ${report.summary.guidesWithOffers} with offers.`
    );
    console.log(`Report saved to ${path.relative(projectRoot, reportPath)}.`);
  } catch (error) {
    console.error(
      `Affiliate engine failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  }
}

main();
