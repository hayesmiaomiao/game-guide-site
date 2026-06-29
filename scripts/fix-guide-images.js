const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const projectRoot = path.resolve(__dirname, "..");
const guidesDirectory = path.join(projectRoot, "content", "guides");

const categoryImages = {
  "build-guide": "/images/guides/build-guide.webp",
  "beginner-guide": "/images/guides/beginner-guide.webp",
  walkthrough: "/images/guides/walkthrough.webp",
  "map-guide": "/images/guides/map-guide.webp",
  "tier-list": "/images/guides/tier-list.webp",
  "boss-guide": "/images/guides/boss-guide.webp",
  "quest-guide": "/images/guides/quest-guide.webp"
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

function updateFrontmatterField(frontmatter, field, value) {
  const linePattern = new RegExp(`^${field}:.*$`, "m");
  const replacement = `${field}: ${JSON.stringify(value)}`;

  if (linePattern.test(frontmatter)) {
    return frontmatter.replace(linePattern, replacement);
  }

  return `${frontmatter.trimEnd()}\n${replacement}`;
}

function updateGuide(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = matter(source);
  const category = slugify(parsed.data.category);
  const heroImage = categoryImages[category];

  if (!heroImage) {
    console.warn(
      `Skipped ${path.relative(projectRoot, filePath)}: no image mapping for category "${category}".`
    );
    return false;
  }

  const boundary = /^(---\r?\n)([\s\S]*?)(\r?\n---)([\s\S]*)$/.exec(source);
  if (!boundary) {
    throw new Error(
      `${path.relative(projectRoot, filePath)} does not contain valid frontmatter.`
    );
  }

  const gameName = titleCase(parsed.data.game);
  const categoryName = titleCase(category);
  const heroAlt = `${gameName} ${categoryName} guide hero image`;
  let frontmatter = boundary[2];
  frontmatter = updateFrontmatterField(frontmatter, "heroImage", heroImage);
  frontmatter = updateFrontmatterField(frontmatter, "heroAlt", heroAlt);

  const nextSource = `${boundary[1]}${frontmatter}${boundary[3]}${boundary[4]}`;
  if (nextSource === source) return false;

  fs.writeFileSync(filePath, nextSource, "utf8");
  console.log(`Updated ${path.relative(projectRoot, filePath)}`);
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

    console.log(
      `Guide image repair complete: ${files.length} guide(s) scanned, ${updated} file(s) updated.`
    );
  } catch (error) {
    console.error(
      `Guide image repair failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  }
}

main();
