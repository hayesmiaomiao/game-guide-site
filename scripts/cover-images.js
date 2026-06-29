const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const projectRoot = path.resolve(__dirname, "..");
const guidesDirectory = path.join(projectRoot, "content", "guides");
const sourceImagesDirectory = path.join(projectRoot, "public", "images", "guides");
const coversDirectory = path.join(projectRoot, "public", "images", "covers");

const keywordMappings = [
  { pattern: /\bstrength\b/i, filename: "strength-build.webp" },
  { pattern: /\bdex(?:terity)?\b/i, filename: "dex-build.webp" },
  { pattern: /\bfaith\b/i, filename: "faith-build.webp" },
  { pattern: /\bbleed(?:ing)?\b/i, filename: "bleed-build.webp" },
  { pattern: /\bboss(?:es)?\b/i, filename: "boss-order.webp" },
  { pattern: /\brunes?\b/i, filename: "rune-farming.webp" },
  { pattern: /\bweapons?\b/i, filename: "early-weapons.webp" },
  { pattern: /\bbeginner\b/i, filename: "beginner-guide.webp" },
  { pattern: /\bmaps?\b/i, filename: "map-guide.webp" },
  { pattern: /\bwalkthrough\b/i, filename: "walkthrough.webp" }
];

const categoryMappings = {
  "beginner-guide": "beginner-guide.webp",
  "build-guide": "strength-build.webp",
  "boss-guide": "boss-order.webp",
  "map-guide": "map-guide.webp",
  walkthrough: "walkthrough.webp",
  "quest-guide": "walkthrough.webp",
  "tier-list": "tier-list.webp"
};

const sourceMappings = {
  "strength-build.webp": "build-guide.webp",
  "dex-build.webp": "build-guide.webp",
  "faith-build.webp": "build-guide.webp",
  "bleed-build.webp": "build-guide.webp",
  "boss-order.webp": "boss-guide.webp",
  "rune-farming.webp": "build-guide.webp",
  "early-weapons.webp": "build-guide.webp",
  "beginner-guide.webp": "beginner-guide.webp",
  "map-guide.webp": "map-guide.webp",
  "walkthrough.webp": "walkthrough.webp",
  "tier-list.webp": "tier-list.webp"
};

function selectCover(data, filename) {
  const searchable = [
    data.keyword,
    data.title,
    data.slug,
    filename.replace(/\.mdx$/i, "")
  ]
    .filter(Boolean)
    .join(" ");
  const keywordMatch = keywordMappings.find(({ pattern }) => pattern.test(searchable));

  return (
    keywordMatch?.filename ||
    categoryMappings[String(data.category || "").toLowerCase()] ||
    "beginner-guide.webp"
  );
}

function ensureCover(filename) {
  const targetPath = path.join(coversDirectory, filename);
  if (fs.existsSync(targetPath)) return false;

  const sourceFilename = sourceMappings[filename] || "beginner-guide.webp";
  const sourcePath = path.join(sourceImagesDirectory, sourceFilename);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing placeholder source: ${path.relative(projectRoot, sourcePath)}`);
  }

  fs.mkdirSync(coversDirectory, { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Created: ${path.relative(projectRoot, targetPath)}`);
  return true;
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

function updateGuide(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = matter(source);
  const coverFilename = selectCover(parsed.data, path.basename(filePath));
  ensureCover(coverFilename);

  const title = String(parsed.data.title || parsed.data.slug || path.basename(filePath, ".mdx"));
  let nextSource = updateFrontmatterField(
    source,
    "heroImage",
    `/images/covers/${coverFilename}`
  );
  nextSource = updateFrontmatterField(
    nextSource,
    "heroAlt",
    `Descriptive image for ${title}`
  );

  if (nextSource === source) return false;
  fs.writeFileSync(filePath, nextSource, "utf8");
  console.log(`Updated: ${path.relative(projectRoot, filePath)}`);
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
    let updated = 0;

    for (const file of files) {
      if (updateGuide(path.join(guidesDirectory, file))) updated += 1;
    }

    console.log(`Cover image update complete: ${files.length} scanned, ${updated} updated.`);
  } catch (error) {
    console.error(
      `Cover image update failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

main();
