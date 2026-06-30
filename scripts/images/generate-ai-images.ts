import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import matter from "gray-matter";
import {
  imageExists,
  readImageMetadata,
  saveFeaturedImage
} from "../../lib/images/image-utils";
import {
  getImageProvider,
  type ImageProvider
} from "../../lib/images/provider";
import type {
  ImageManifest,
  ImageManifestEntry
} from "../../lib/images/types";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "image-manifest.json");
const guidesDirectory = path.join(projectRoot, "content", "guides");
const outputDirectory = path.join(projectRoot, "public", "images", "guides");

function readManifest() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error("image-manifest.json does not exist. Run npm run image:prepare first.");
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8")
  ) as ImageManifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.images)) {
    throw new Error("image-manifest.json has an unsupported format.");
  }

  return manifest;
}

function readGuideFiles() {
  const guides = new Map<string, { filePath: string; source: string }>();

  for (const file of fs.readdirSync(guidesDirectory)) {
    if (!file.endsWith(".mdx")) continue;

    const filePath = path.join(guidesDirectory, file);
    const source = fs.readFileSync(filePath, "utf8");
    const parsed = matter(source);
    const slug = String(parsed.data.slug || file.replace(/\.mdx$/, ""));
    guides.set(slug, { filePath, source });
  }

  return guides;
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

function syncGuideFrontmatter(
  entry: ImageManifestEntry,
  guide: { filePath: string; source: string },
  imagePath: string
) {
  let nextSource = updateFrontmatterField(guide.source, "image", imagePath);
  nextSource = updateFrontmatterField(nextSource, "heroImage", imagePath);

  if (nextSource === guide.source) return false;
  fs.writeFileSync(guide.filePath, nextSource, "utf8");
  guide.source = nextSource;
  console.log(
    `Frontmatter: ${path.relative(projectRoot, guide.filePath)} -> ${imagePath}`
  );
  return true;
}

async function main() {
  try {
    const manifest = readManifest();
    const guides = readGuideFiles();
    let provider: ImageProvider | undefined;
    let generated = 0;
    let skipped = 0;
    let updatedGuides = 0;

    for (let index = 0; index < manifest.images.length; index += 1) {
      const entry = manifest.images[index];
      const guide = guides.get(entry.slug);
      if (!guide) {
        throw new Error(`No MDX guide found for manifest slug "${entry.slug}".`);
      }

      const outputPath = path.join(outputDirectory, entry.filename);
      const publicPath = `/images/guides/${entry.filename}`;
      const progress = `[${index + 1}/${manifest.images.length}]`;

      if (await imageExists(outputPath)) {
        skipped += 1;
        console.log(`${progress} Skipped existing image: ${entry.filename}`);
      } else {
        provider ||= getImageProvider();
        console.log(`${progress} Generating with ${provider.name}: ${entry.filename}`);
        const image = await provider.generate(entry.prompt);
        await saveFeaturedImage(image, outputPath);

        const metadata = await readImageMetadata(outputPath);
        if (
          metadata.width !== 1200 ||
          metadata.height !== 675 ||
          metadata.format !== "webp"
        ) {
          throw new Error(
            `Generated image validation failed for ${entry.filename}: ${metadata.width}x${metadata.height} ${metadata.format}.`
          );
        }
        generated += 1;
        console.log(`${progress} Saved: ${path.relative(projectRoot, outputPath)}`);
      }

      if (syncGuideFrontmatter(entry, guide, publicPath)) {
        updatedGuides += 1;
      }
    }

    console.log(
      `AI image generation complete: ${generated} generated, ${skipped} skipped, ${updatedGuides} guide(s) updated.`
    );
  } catch (error) {
    console.error(
      `AI image generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

void main();
