const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const projectRoot = path.resolve(__dirname, "..");
const guidesDirectory = path.join(projectRoot, "content", "guides");
const assetsDirectory = path.join(projectRoot, "content", "assets");
const sourceImagesDirectory = path.join(projectRoot, "public", "images", "guides");
const publicDirectory = path.join(projectRoot, "public");

const categoryPlaceholders = {
  "beginner-guide": "beginner-guide.webp",
  "build-guide": "build-guide.webp",
  "boss-guide": "boss-guide.webp",
  "map-guide": "map-guide.webp",
  walkthrough: "walkthrough.webp",
  "quest-guide": "quest-guide.webp",
  "tier-list": "tier-list.webp"
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value) {
  return String(value || "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function validateImagePath(imagePath, configPath) {
  if (!/^\/images\/covers\/[a-z0-9-]+\.webp$/.test(imagePath)) {
    throw new Error(
      `${path.relative(projectRoot, configPath)} contains an invalid cover path: ${imagePath}`
    );
  }
}

function loadAssetConfig(gameSlug) {
  const configPath = path.join(assetsDirectory, `${gameSlug}.json`);
  if (!fs.existsSync(configPath)) {
    return {
      configPath,
      game: titleCase(gameSlug),
      default: `/images/covers/${gameSlug}-default.webp`,
      rules: []
    };
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!config.game || !config.default || !Array.isArray(config.rules)) {
    throw new Error(
      `${path.relative(projectRoot, configPath)} must define game, default, and rules.`
    );
  }

  validateImagePath(config.default, configPath);
  for (const rule of config.rules) {
    if (!Array.isArray(rule.match) || !rule.match.length || !rule.image || !rule.alt) {
      throw new Error(
        `${path.relative(projectRoot, configPath)} contains an invalid cover rule.`
      );
    }
    validateImagePath(rule.image, configPath);
  }

  return { ...config, configPath };
}

function ensureCover(imagePath, category) {
  const relativeImagePath = imagePath.replace(/^\/+/, "");
  const targetPath = path.resolve(publicDirectory, relativeImagePath);
  const coversRoot = path.resolve(publicDirectory, "images", "covers");

  if (!targetPath.startsWith(`${coversRoot}${path.sep}`)) {
    throw new Error(`Refusing to write cover outside public/images/covers: ${imagePath}`);
  }
  if (fs.existsSync(targetPath)) return false;

  const sourceFilename =
    categoryPlaceholders[String(category || "").toLowerCase()] || "beginner-guide.webp";
  const sourcePath = path.join(sourceImagesDirectory, sourceFilename);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing placeholder source: ${path.relative(projectRoot, sourcePath)}`);
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Created: ${path.relative(projectRoot, targetPath)}`);
  return true;
}

function ensureConfiguredAssets(config) {
  ensureCover(config.default, "beginner-guide");
  for (const rule of config.rules) {
    const category = rule.image.includes("boss")
      ? "boss-guide"
      : rule.image.includes("beginner")
        ? "beginner-guide"
        : "build-guide";
    ensureCover(rule.image, category);
  }
}

function containsTerm(searchable, term) {
  const normalizedTerm = String(term || "").toLowerCase().trim();
  if (!normalizedTerm) return false;

  const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(searchable);
}

function findRule(rules, searchable) {
  return rules.find((rule) => rule.match.some((term) => containsTerm(searchable, term)));
}

function selectCover(config, data, filename) {
  const primarySearchable = [
    data.keyword,
    data.title,
    data.slug,
    filename.replace(/\.mdx$/i, "")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const categorySearchable = String(data.category || "").toLowerCase();
  const rule =
    findRule(config.rules, primarySearchable) ||
    findRule(config.rules, categorySearchable);

  return rule
    ? { image: rule.image, alt: rule.alt }
    : {
        image: config.default,
        alt: `Descriptive image for ${String(data.title || `${config.game} guide`)}`
      };
}

function updateFrontmatterField(source, field, value) {
  const boundary = /^(---\r?\n)([\s\S]*?)(\r?\n---)/.exec(source);
  if (!boundary) throw new Error("Guide does not contain valid frontmatter.");

  const pattern = new RegExp(`^${field}:.*$`, "m");
  const replacement = `${field}: ${JSON.stringify(value)}`;
  const frontmatter = pattern.test(boundary[2])
    ? boundary[2].replace(pattern, replacement)
    : `${boundary[2].trimEnd()}\n${replacement}`;

  return `${boundary[1]}${frontmatter}${source.slice(boundary[1].length + boundary[2].length)}`;
}

function updateGuide(filePath, configCache) {
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = matter(source);
  const gameSlug = slugify(parsed.data.game);
  if (!gameSlug) {
    throw new Error(`${path.relative(projectRoot, filePath)} is missing a valid game slug.`);
  }

  let config = configCache.get(gameSlug);
  if (!config) {
    config = loadAssetConfig(gameSlug);
    ensureConfiguredAssets(config);
    configCache.set(gameSlug, config);
  }

  const selected = selectCover(config, parsed.data, path.basename(filePath));
  ensureCover(selected.image, parsed.data.category);

  let nextSource = updateFrontmatterField(source, "heroImage", selected.image);
  nextSource = updateFrontmatterField(nextSource, "heroAlt", selected.alt);

  if (nextSource === source) return false;
  fs.writeFileSync(filePath, nextSource, "utf8");
  console.log(`Updated: ${path.relative(projectRoot, filePath)} -> ${selected.image}`);
  return true;
}

function main() {
  try {
    if (!fs.existsSync(guidesDirectory)) {
      throw new Error("content/guides directory does not exist.");
    }

    const files = fs
      .readdirSync(guidesDirectory)
      .filter((file) => file.endsWith(".mdx"))
      .sort((left, right) => left.localeCompare(right));
    const configCache = new Map();
    let updated = 0;

    for (const file of files) {
      if (updateGuide(path.join(guidesDirectory, file), configCache)) updated += 1;
    }

    console.log(
      `Cover image update complete: ${files.length} scanned, ${updated} updated, ${configCache.size} game config(s) loaded.`
    );
  } catch (error) {
    console.error(
      `Cover image update failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

main();
