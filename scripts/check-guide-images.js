const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const projectRoot = process.cwd();
const guidesDirectory = path.join(projectRoot, "content", "guides");
const publicDirectory = path.join(projectRoot, "public");
const defaultImage = "/images/guides/default.webp";

function publicPathToFile(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "";
  const clean = value.split(/[?#]/, 1)[0].replace(/^\/+/, "");
  const resolved = path.resolve(publicDirectory, clean);
  if (!resolved.startsWith(`${publicDirectory}${path.sep}`)) return "";
  return resolved;
}

function localImageExists(value) {
  const filePath = publicPathToFile(value);
  return Boolean(filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile());
}

function isDefault(value) {
  return value === defaultImage || /\/default\.webp$/.test(String(value || ""));
}

function main() {
  if (!fs.existsSync(guidesDirectory)) {
    throw new Error("content/guides directory does not exist.");
  }

  const files = fs.readdirSync(guidesDirectory).filter((file) => file.endsWith(".mdx")).sort();
  const imageToSlugs = new Map();
  const missing = [];
  const invalid = [];
  const defaultUsers = [];
  let independent = 0;

  for (const file of files) {
    const filePath = path.join(guidesDirectory, file);
    const parsed = matter(fs.readFileSync(filePath, "utf8"));
    const slug = String(parsed.data.slug || file.replace(/\.mdx$/, ""));
    const image = parsed.data.coverImage || parsed.data.heroImage || parsed.data.image || "";

    if (!image) {
      missing.push(slug);
      continue;
    }

    if (!localImageExists(image)) {
      invalid.push(`${slug} -> ${image}`);
      continue;
    }

    if (isDefault(image)) {
      defaultUsers.push(slug);
      continue;
    }

    independent += 1;
    const users = imageToSlugs.get(image) || [];
    users.push(slug);
    imageToSlugs.set(image, users);
  }

  const duplicatePaths = Array.from(imageToSlugs.entries())
    .filter(([, slugs]) => slugs.length > 1)
    .map(([image, slugs]) => ({ image, slugs }));

  console.log(`Guide total: ${files.length}`);
  console.log(`Independent images: ${independent}`);
  console.log(`Missing image fields: ${missing.length}`);
  console.log(`Invalid image paths: ${invalid.length}`);
  console.log(`Duplicate image paths: ${duplicatePaths.length}`);
  console.log(`Default image usage: ${defaultUsers.length}`);

  if (duplicatePaths.length) {
    console.log("\nDuplicate image report:");
    duplicatePaths.forEach((item) => {
      console.log(`- ${item.image}`);
      item.slugs.forEach((slug) => console.log(`  - ${slug}`));
    });
  }

  if (invalid.length) {
    console.log("\nInvalid image report:");
    invalid.forEach((item) => console.log(`- ${item}`));
  }

  if (missing.length) {
    console.log("\nMissing image report:");
    missing.forEach((slug) => console.log(`- ${slug}`));
  }

  if (duplicatePaths.length || invalid.length || missing.length || defaultUsers.length) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(`Guide image check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
