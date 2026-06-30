import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type {
  ImageGuideInput,
  ImageManifest,
  ImageManifestEntry
} from "../../lib/images/types";
import { buildImagePrompt } from "./prompt-builder";

const projectRoot = process.cwd();
const guidesDirectory = path.join(projectRoot, "content", "guides");
const manifestPath = path.join(projectRoot, "image-manifest.json");

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 6);
}

function deriveKeyword(data: Record<string, unknown>, fileSlug: string) {
  if (typeof data.keyword === "string" && data.keyword.trim()) {
    return slugify(data.keyword);
  }

  const game = slugify(String(data.game || ""));
  const guideSlug = slugify(String(data.slug || fileSlug));
  let keyword = guideSlug.startsWith(`${game}-`)
    ? guideSlug.slice(game.length + 1)
    : guideSlug;

  keyword = keyword.replace(/^best-/, "").replace(/-guide-guide$/, "-guide");
  return keyword || slugify(String(data.category || "guide"));
}

function updateFrontmatterField(source: string, field: string, value: string) {
  const boundary = /^(---\r?\n)([\s\S]*?)(\r?\n---)/.exec(source);
  if (!boundary) throw new Error("Guide does not contain valid frontmatter.");

  const pattern = new RegExp(`^${field}:.*$`, "m");
  const replacement = `${field}: ${JSON.stringify(value)}`;
  const frontmatter = pattern.test(boundary[2])
    ? boundary[2].replace(pattern, replacement)
    : `${boundary[2].trimEnd()}\n${replacement}`;

  return `${boundary[1]}${frontmatter}${source.slice(boundary[1].length + boundary[2].length)}`;
}

function createUniqueFilename(
  guide: ImageGuideInput,
  usedFilenames: Set<string>
) {
  const preferred = `${slugify(guide.game)}-${slugify(guide.keyword)}.webp`;
  if (!usedFilenames.has(preferred)) {
    usedFilenames.add(preferred);
    return preferred;
  }

  const filename = `${preferred.replace(/\.webp$/, "")}-${stableHash(guide.slug)}.webp`;
  if (usedFilenames.has(filename)) {
    throw new Error(`Unable to create a unique image filename for ${guide.slug}.`);
  }
  usedFilenames.add(filename);
  return filename;
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
      const fileSlug = file.replace(/\.mdx$/, "");
      const guide: ImageGuideInput = {
        title: String(parsed.data.title || fileSlug),
        slug: slugify(String(parsed.data.slug || fileSlug)),
        game: slugify(String(parsed.data.game || "unknown-game")),
        category: slugify(String(parsed.data.category || "uncategorized")),
        keyword: deriveKeyword(parsed.data, fileSlug),
        difficulty: String(parsed.data.difficulty || "Unknown")
      };

      return { filePath, source, guide };
    });
}

function main() {
  try {
    if (!fs.existsSync(guidesDirectory)) {
      throw new Error("content/guides directory does not exist.");
    }

    const usedFilenames = new Set<string>();
    const usedPrompts = new Set<string>();
    const entries: ImageManifestEntry[] = [];
    let updatedGuides = 0;

    for (const item of readGuides()) {
      const filename = createUniqueFilename(item.guide, usedFilenames);
      const imagePath = `/images/generated/${filename}`;
      const prompt = buildImagePrompt(item.guide);

      if (usedPrompts.has(prompt)) {
        throw new Error(`Duplicate image prompt generated for ${item.guide.slug}.`);
      }
      usedPrompts.add(prompt);

      entries.push({
        ...item.guide,
        filename,
        imagePath,
        prompt
      });

      const nextSource = updateFrontmatterField(
        item.source,
        "heroImage",
        imagePath
      );
      if (nextSource !== item.source) {
        fs.writeFileSync(item.filePath, nextSource, "utf8");
        updatedGuides += 1;
        console.log(
          `Updated: ${path.relative(projectRoot, item.filePath)} -> ${imagePath}`
        );
      }
    }

    const manifest: ImageManifest = {
      version: 1,
      images: entries
    };
    fs.writeFileSync(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );

    console.log(
      `Image preparation complete: ${entries.length} prompt(s), ${usedFilenames.size} unique filename(s), ${updatedGuides} guide(s) updated.`
    );
    console.log(`Manifest: ${path.relative(projectRoot, manifestPath)}`);
    console.log("No images were generated.");
  } catch (error) {
    console.error(
      `Image preparation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

main();
