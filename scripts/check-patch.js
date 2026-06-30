const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const projectRoot = path.resolve(__dirname, "..");
const patchesDirectory = path.join(projectRoot, "content", "patches");
const guidesDirectory = path.join(projectRoot, "content", "guides");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function today() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function updateFrontmatterField(source, field, yamlValue) {
  const boundary = /^(---\r?\n)([\s\S]*?)(\r?\n---)/.exec(source);
  if (!boundary) throw new Error("Guide does not contain valid frontmatter.");

  const pattern = new RegExp(`^${field}:.*$`, "m");
  const replacement = `${field}: ${yamlValue}`;
  const frontmatter = pattern.test(boundary[2])
    ? boundary[2].replace(pattern, replacement)
    : `${boundary[2].trimEnd()}\n${replacement}`;

  return `${boundary[1]}${frontmatter}${source.slice(boundary[1].length + boundary[2].length)}`;
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

      return {
        file,
        filePath,
        source,
        data: parsed.data,
        slug: String(parsed.data.slug || file.replace(/\.mdx$/, "")),
        game: slugify(parsed.data.game)
      };
    });
}

function readPatchConfig(filePath) {
  const config = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const currentPatch = String(config.currentPatch || "").trim();

  if (!currentPatch) {
    throw new Error(
      `${path.relative(projectRoot, filePath)} must define a non-empty currentPatch.`
    );
  }
  if (config.updatedGuides !== undefined && !Array.isArray(config.updatedGuides)) {
    throw new Error(
      `${path.relative(projectRoot, filePath)} must define updatedGuides as an array.`
    );
  }

  return {
    ...config,
    currentPatch,
    lastChecked: String(config.lastChecked || ""),
    updatedGuides: config.updatedGuides || []
  };
}

function updateGuide(guide, currentPatch, reviewDate) {
  if (String(guide.data.patch || "") === currentPatch) return false;

  let nextSource = updateFrontmatterField(
    guide.source,
    "patch",
    JSON.stringify(currentPatch)
  );
  nextSource = updateFrontmatterField(nextSource, "needsUpdate", "true");
  nextSource = updateFrontmatterField(
    nextSource,
    "lastReviewed",
    JSON.stringify(reviewDate)
  );

  fs.writeFileSync(guide.filePath, nextSource, "utf8");
  console.log(`Updated: ${path.relative(projectRoot, guide.filePath)}`);
  return true;
}

function checkGamePatch(patchFilePath, guides, reviewDate) {
  const gameSlug = path.basename(patchFilePath, ".json");
  const config = readPatchConfig(patchFilePath);
  const gameGuides = guides.filter((guide) => guide.game === gameSlug);
  const updatedGuides = [];

  for (const guide of gameGuides) {
    if (updateGuide(guide, config.currentPatch, reviewDate)) {
      updatedGuides.push(guide.slug);
    }
  }

  const nextConfig = {
    ...config,
    lastChecked: reviewDate,
    updatedGuides: updatedGuides.length ? updatedGuides : config.updatedGuides
  };
  const nextSource = `${JSON.stringify(nextConfig, null, 2)}\n`;
  const currentSource = fs.readFileSync(patchFilePath, "utf8");
  if (nextSource !== currentSource) {
    fs.writeFileSync(patchFilePath, nextSource, "utf8");
  }

  console.log(
    `[${gameSlug}] Patch ${config.currentPatch}: ${gameGuides.length} guide(s) checked, ${updatedGuides.length} marked for update.`
  );

  return updatedGuides.length;
}

function main() {
  try {
    if (!fs.existsSync(patchesDirectory)) {
      throw new Error("content/patches directory does not exist.");
    }
    if (!fs.existsSync(guidesDirectory)) {
      throw new Error("content/guides directory does not exist.");
    }

    const patchFiles = fs
      .readdirSync(patchesDirectory)
      .filter((file) => file.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right));
    if (!patchFiles.length) {
      console.log("No patch configuration files found.");
      return;
    }

    const guides = readGuides();
    const reviewDate = today();
    let updated = 0;

    for (const patchFile of patchFiles) {
      updated += checkGamePatch(
        path.join(patchesDirectory, patchFile),
        guides,
        reviewDate
      );
    }

    console.log(
      `Patch check complete: ${patchFiles.length} game(s) checked, ${updated} guide(s) marked for update.`
    );
  } catch (error) {
    console.error(
      `Patch check failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

main();
