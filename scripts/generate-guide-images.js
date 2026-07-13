const fs = require("fs");
const path = require("path");
require("dotenv/config");
const matter = require("gray-matter");
const sharp = require("sharp");

const projectRoot = process.cwd();
const guidesDirectory = path.join(projectRoot, "content", "guides");
const outputDirectory = path.join(projectRoot, "public", "images", "guides");
const promptManifestPath = path.join(projectRoot, "scripts", "image-prompts.json");
const publicDefaultImage = "/images/guides/default.webp";
const defaultImagePath = path.join(projectRoot, "public", "images", "guides", "default.webp");

const sharedImageNames = new Set([
  "/images/guides/default.webp",
  "/images/covers/elden-ring-default.webp",
  "/images/covers/honkai-star-rail-default.webp",
  "/images/covers/the-legend-of-zelda-tears-of-the-kingdom-default.webp",
  "/images/covers/elden-ring-boss-order.webp",
  "/images/covers/elden-ring-beginner.webp",
  "/images/covers/elden-ring-early-weapons.webp",
  "/images/covers/elden-ring-strength.webp",
  "/images/covers/elden-ring-dex.webp",
  "/images/covers/elden-ring-faith.webp",
  "/images/covers/elden-ring-intelligence.webp",
  "/images/covers/elden-ring-bleed.webp",
  "/images/covers/elden-ring-rune-farming.webp"
]);

const categoryBaseImages = {
  bosses: "/images/guides/boss-guide.webp",
  weapons: "/images/guides/build-guide.webp",
  "build-guide": "/images/guides/build-guide.webp",
  "quest-guide": "/images/guides/quest-guide.webp",
  "map-guide": "/images/guides/map-guide.webp",
  items: "/images/guides/quest-guide.webp",
  "beginner-guide": "/images/guides/beginner-guide.webp",
  walkthrough: "/images/guides/walkthrough.webp",
  "tier-list": "/images/guides/tier-list.webp"
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicPathToFile(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "";
  }
  const clean = value.split(/[?#]/, 1)[0].replace(/^\/+/, "");
  const resolved = path.resolve(projectRoot, "public", clean);
  const publicRoot = path.resolve(projectRoot, "public");
  if (!resolved.startsWith(`${publicRoot}${path.sep}`)) return "";
  return resolved;
}

function localImageExists(value) {
  const filePath = publicPathToFile(value);
  return Boolean(filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile());
}

function isIndependentCover(slug, coverImage) {
  if (!localImageExists(coverImage)) return false;
  if (sharedImageNames.has(coverImage)) return false;
  return path.basename(coverImage) === `${slug}.webp`;
}

function fieldLine(field, value) {
  return `${field}: ${JSON.stringify(value)}`;
}

function setFrontmatterFields(source, fields) {
  const boundary = /^(---\r?\n)([\s\S]*?)(\r?\n---)/.exec(source);
  if (!boundary) throw new Error("Guide does not contain valid frontmatter.");

  let frontmatter = boundary[2];
  for (const [field, value] of Object.entries(fields)) {
    const replacement = fieldLine(field, value);
    const pattern = new RegExp(`^${field}:.*(?:\\r?\\n(?![A-Za-z0-9_-]+:)[ \\t].*)*`, "m");
    frontmatter = pattern.test(frontmatter)
      ? frontmatter.replace(pattern, replacement)
      : `${frontmatter.trimEnd()}\n${replacement}`;
  }

  return `${boundary[1]}${frontmatter}${source.slice(boundary[1].length + boundary[2].length)}`;
}

function subjectFromTitle(title, category, tags) {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  const cleanedTitle = String(title)
    .replace(/^Elden Ring\s+/i, "")
    .replace(/^Honkai Star Rail\s+/i, "")
    .replace(/^Zelda\s+/i, "")
    .replace(/\b(guide|locations|location|build|boss|weapon|questline|map)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (category === "bosses" || text.includes("boss")) return `${cleanedTitle || "boss"} boss battle`;
  if (category === "weapons" || text.includes("weapon")) return `${cleanedTitle || "weapon"} weapon close-up`;
  if (category === "quest-guide" || text.includes("quest")) return `${cleanedTitle || "quest"} NPC quest moment`;
  if (category === "build-guide" || text.includes("build")) return `${cleanedTitle || "build"} character build`;
  if (category === "map-guide" || text.includes("map") || text.includes("locations")) return `${cleanedTitle || "location"} landscape and dungeon route`;
  if (category === "items" || text.includes("item")) return `${cleanedTitle || "item"} item close-up`;
  if (category === "beginner-guide") return "new adventurer exploring an open world";
  return cleanedTitle || "game guide subject";
}

function sceneAdjustment(category) {
  const scenes = {
    bosses: "Highlight the boss and combat arena with clear confrontation energy.",
    weapons: "Highlight the weapon as the focal point with an environment matching its element or combat style.",
    "quest-guide": "Highlight the NPC, quest location, or key quest object.",
    "build-guide": "Highlight the character equipment, weapon choice, and fighting style.",
    "map-guide": "Highlight the area landscape, architecture, ruins, cave, or dungeon entrance.",
    items: "Highlight the item close-up with a game-world environment in the background.",
    "beginner-guide": "Highlight exploration, a safe campfire, a map, or an open-world starting route."
  };
  return scenes[category] || "Highlight the article subject with a readable fantasy guide composition.";
}

function buildPrompt(guide) {
  const subject = subjectFromTitle(guide.title, guide.category, guide.tags);
  return [
    `Create a cinematic dark fantasy game guide thumbnail for an article titled "${guide.title}".`,
    "",
    "Subject:",
    subject,
    "",
    "Scene requirements:",
    `- ${sceneAdjustment(guide.category)}`,
    "- subject clearly visible",
    "- dramatic fantasy environment",
    "- strong focal point",
    "- high detail",
    "- suitable for a professional game guide website",
    "- landscape composition",
    "- leave enough negative space around the subject",
    "- no text",
    "- no logo",
    "- no watermark",
    "- no user interface",
    "- no border",
    "- 16:9 aspect ratio"
  ].join("\n");
}

function hasConfiguredImageApi() {
  return Boolean(process.env.IMAGE_PROVIDER && process.env.OPENAI_API_KEY);
}

function chooseBaseImage(data) {
  const candidates = [
    categoryBaseImages[data.category],
    data.heroImage,
    data.image,
    "/images/covers/elden-ring-default.webp",
    publicDefaultImage
  ].filter(Boolean);
  const existing = candidates.find(localImageExists);
  return existing || publicDefaultImage;
}

function colorForSlug(slug) {
  let hash = 2166136261;
  for (const character of slug) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const hue = hash >>> 0;
  return {
    r: 40 + (hue % 80),
    g: 35 + ((hue >> 8) % 70),
    b: 80 + ((hue >> 16) % 110)
  };
}

async function ensureDefaultImage() {
  if (localImageExists(publicDefaultImage)) return;
  fs.mkdirSync(outputDirectory, { recursive: true });
  const source = localImageExists("/images/covers/elden-ring-default.webp")
    ? publicPathToFile("/images/covers/elden-ring-default.webp")
    : "";

  if (source) {
    await sharp(source).resize(1200, 675, { fit: "cover" }).webp({ quality: 78 }).toFile(defaultImagePath);
    return;
  }

  await sharp({
    create: {
      width: 1200,
      height: 675,
      channels: 3,
      background: { r: 15, g: 23, b: 42 }
    }
  })
    .webp({ quality: 78 })
    .toFile(defaultImagePath);
}

async function createLocalThumbnail(guide, outputPath, baseImage) {
  const source = publicPathToFile(baseImage);
  const color = colorForSlug(guide.slug);
  const overlay = Buffer.from(
    `<svg width="1200" height="675" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="rgb(${color.r},${color.g},${color.b})" stop-opacity="0.40"/>
          <stop offset="0.55" stop-color="rgb(${Math.max(color.r - 20, 0)},20,80)" stop-opacity="0.12"/>
          <stop offset="1" stop-color="rgb(3,7,18)" stop-opacity="0.62"/>
        </linearGradient>
        <radialGradient id="r" cx="${20 + (color.r % 60)}%" cy="${25 + (color.g % 45)}%" r="60%">
          <stop offset="0" stop-color="white" stop-opacity="0.20"/>
          <stop offset="1" stop-color="white" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#g)"/>
      <rect width="1200" height="675" fill="url(#r)"/>
    </svg>`
  );

  await sharp(source || defaultImagePath)
    .resize(1200, 675, { fit: "cover", position: "attention" })
    .modulate({
      brightness: 0.78 + (color.r % 18) / 100,
      saturation: 0.88 + (color.g % 30) / 100,
      hue: color.b % 45
    })
    .composite([{ input: overlay, blend: "over" }])
    .webp({ quality: 72, effort: 6 })
    .toFile(outputPath);
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
      const slug = slugify(parsed.data.slug || file.replace(/\.mdx$/, ""));
      return {
        filePath,
        source,
        data: parsed.data,
        guide: {
          title: String(parsed.data.title || slug),
          slug,
          category: slugify(parsed.data.category || "uncategorized"),
          tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [],
          game: slugify(parsed.data.game || "unknown-game")
        }
      };
    });
}

async function main() {
  if (!fs.existsSync(guidesDirectory)) {
    throw new Error("content/guides directory does not exist.");
  }

  await ensureDefaultImage();
  fs.mkdirSync(outputDirectory, { recursive: true });

  const imageApiConfigured = hasConfiguredImageApi();
  const prompts = [];
  let skipped = 0;
  let queued = 0;
  let frontmatterUpdated = 0;
  let localImagesCreated = 0;

  for (const item of readGuides()) {
    const { guide, data } = item;
    const publicPath = `/images/guides/${guide.slug}.webp`;
    const outputPath = path.join(outputDirectory, `${guide.slug}.webp`);
    const imageAlt = `Cinematic game guide thumbnail for ${guide.title}`;
    const hasIndependentCover = isIndependentCover(guide.slug, data.coverImage);
    const needsImage = !hasIndependentCover || !fs.existsSync(outputPath);

    if (!needsImage) {
      skipped += 1;
      continue;
    }

    const prompt = buildPrompt(guide);
    prompts.push({
      slug: guide.slug,
      title: guide.title,
      category: guide.category,
      prompt,
      outputPath: publicPath
    });

    const nextSource = setFrontmatterFields(item.source, {
      coverImage: publicPath,
      imageAlt
    });
    if (nextSource !== item.source) {
      fs.writeFileSync(item.filePath, nextSource, "utf8");
      frontmatterUpdated += 1;
    }

    if (!imageApiConfigured && !fs.existsSync(outputPath)) {
      await createLocalThumbnail(guide, outputPath, chooseBaseImage(data));
      localImagesCreated += 1;
    }

    queued += 1;
    console.log(`Queued: ${guide.slug} -> ${publicPath}`);
  }

  fs.writeFileSync(promptManifestPath, `${JSON.stringify(prompts, null, 2)}\n`, "utf8");

  console.log("");
  console.log(`Guide image sync complete: ${queued} queued, ${skipped} skipped.`);
  console.log(`Frontmatter updated: ${frontmatterUpdated}`);
  console.log(`Local WebP placeholders created: ${localImagesCreated}`);
  console.log(`Prompt manifest: ${path.relative(projectRoot, promptManifestPath)}`);
  if (!imageApiConfigured) {
    console.log("Image API not fully configured for this script.");
    console.log("Set IMAGE_PROVIDER=openai and OPENAI_API_KEY in an ignored local env file to replace placeholders with generated images later.");
  }
}

main().catch((error) => {
  console.error(`Guide image generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
