const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const projectRoot = path.resolve(__dirname, "..");
const guidesDir = path.join(projectRoot, "content", "guides");

const requiredFields = [
  "title",
  "slug",
  "game",
  "category",
  "difficulty",
  "author",
  "reviewer",
  "publishDate",
  "updatedDate",
  "heroImage",
  "heroAlt",
  "excerpt",
  "platform",
  "patch",
  "readingTime",
  "tags",
  "featured",
  "related",
  "faq",
  "seoTitle",
  "metaDescription"
];

const arrayFields = ["tags", "related", "faq"];
const stringFields = requiredFields.filter(
  (field) => !arrayFields.includes(field) && field !== "featured"
);

function isMissing(data, field) {
  if (!Object.prototype.hasOwnProperty.call(data, field)) return true;
  if (data[field] === null || data[field] === undefined) return true;
  return typeof data[field] === "string" && data[field].trim() === "";
}

function validateFile(file) {
  const relativePath = path.join("content", "guides", file);
  const errors = [];

  let parsed;
  try {
    parsed = matter(fs.readFileSync(path.join(guidesDir, file), "utf8"));
  } catch (error) {
    return [`${relativePath}: invalid frontmatter (${error.message})`];
  }

  const data = parsed.data;
  const missing = requiredFields.filter((field) => isMissing(data, field));
  if (missing.length) {
    errors.push(`${relativePath}: missing required fields: ${missing.join(", ")}`);
  }

  for (const field of stringFields) {
    if (!isMissing(data, field) && typeof data[field] !== "string") {
      errors.push(`${relativePath}: field "${field}" must be a string`);
    }
  }

  for (const field of arrayFields) {
    if (!isMissing(data, field) && !Array.isArray(data[field])) {
      errors.push(`${relativePath}: field "${field}" must be an array`);
    }
  }

  if (!isMissing(data, "featured") && typeof data.featured !== "boolean") {
    errors.push(`${relativePath}: field "featured" must be true or false`);
  }

  const expectedSlug = file.replace(/\.mdx$/, "");
  if (!isMissing(data, "slug") && data.slug !== expectedSlug) {
    errors.push(
      `${relativePath}: field "slug" must match filename (expected "${expectedSlug}", received "${data.slug}")`
    );
  }

  if (Array.isArray(data.faq)) {
    data.faq.forEach((item, index) => {
      if (
        !item ||
        typeof item.question !== "string" ||
        !item.question.trim() ||
        typeof item.answer !== "string" ||
        !item.answer.trim()
      ) {
        errors.push(`${relativePath}: faq[${index}] must contain non-empty "question" and "answer" strings`);
      }
    });
  }

  return errors;
}

function main() {
  if (!fs.existsSync(guidesDir)) {
    console.error("Guide validation failed:\ncontent/guides directory does not exist.");
    process.exitCode = 1;
    return;
  }

  const files = fs.readdirSync(guidesDir).filter((file) => file.endsWith(".mdx")).sort();
  if (!files.length) {
    console.error("Guide validation failed:\nNo MDX files found in content/guides.");
    process.exitCode = 1;
    return;
  }

  const errors = files.flatMap(validateFile);
  if (errors.length) {
    console.error(`Guide validation failed with ${errors.length} error(s):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Guide validation passed: ${files.length} MDX file(s) checked.`);
}

main();
