const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const guidesDirectory = path.join(projectRoot, "content", "guides");
const tocSectionPattern =
  /^## Table of Contents[ \t]*\r?\n[\s\S]*?(?=^##[ \t]+|(?![\s\S]))/m;
const orphanedTocListPattern =
  /^(?:[ \t]*-[ \t]+\[[^\]\r\n]+\]\(#[^)]+\)[ \t]*\r?\n)+(?:\r?\n)*/;

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitFrontmatter(source, filePath) {
  const match = /^(---\r?\n[\s\S]*?\r?\n---)(\r?\n?)([\s\S]*)$/.exec(source);
  if (!match) {
    throw new Error(
      `${path.relative(projectRoot, filePath)} does not contain valid frontmatter.`
    );
  }

  return {
    frontmatter: match[1],
    separator: match[2] || "\n\n",
    body: match[3]
  };
}

function removeExistingToc(body) {
  return body
    .replace(tocSectionPattern, "")
    .replace(orphanedTocListPattern, "")
    .replace(/^\s+/, "");
}

function extractHeadings(body) {
  const headings = [];
  const lines = body.split(/\r?\n/);
  let inCodeFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = /^(##|###)[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
    if (!match) continue;

    const text = match[2].trim();
    if (text.toLowerCase() === "table of contents") continue;

    const id = slugify(text);
    if (!id) continue;

    headings.push({
      depth: match[1].length,
      text,
      id
    });
  }

  return headings;
}

function escapeLinkText(value) {
  return value.replace(/([\[\]])/g, "\\$1");
}

function buildToc(headings) {
  const links = headings
    .map((heading) => {
      const indent = heading.depth === 3 ? "  " : "";
      return `${indent}- [${escapeLinkText(heading.text)}](#${heading.id})`;
    })
    .join("\n");

  return `## Table of Contents\n\n${links}\n\n`;
}

function updateGuide(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const { frontmatter, separator, body } = splitFrontmatter(source, filePath);
  const cleanBody = removeExistingToc(body);
  const headings = extractHeadings(cleanBody);

  if (!headings.length) {
    return false;
  }

  const firstH2Index = cleanBody.search(/^##[ \t]+/m);
  if (firstH2Index < 0) {
    return false;
  }

  const beforeFirstH2 = cleanBody.slice(0, firstH2Index).trimEnd();
  const fromFirstH2 = cleanBody.slice(firstH2Index).trimStart();
  const prefix = beforeFirstH2 ? `${beforeFirstH2}\n\n` : "";
  const nextBody = `${prefix}${buildToc(headings)}${fromFirstH2}`.trimEnd();
  const nextSource = `${frontmatter}${separator}${nextBody}\n`;

  if (nextSource === source) {
    return false;
  }

  fs.writeFileSync(filePath, nextSource, "utf8");
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
      const filePath = path.join(guidesDirectory, file);
      if (updateGuide(filePath)) {
        updated += 1;
        console.log("Updated:");
        console.log(path.relative(projectRoot, filePath).replace(/\\/g, "/"));
        console.log("Added TOC");
      }
    }

    console.log(
      `TOC complete: ${files.length} guide(s) scanned, ${updated} file(s) updated.`
    );
  } catch (error) {
    console.error(
      `TOC generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  }
}

main();
