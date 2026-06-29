const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const guidesDir = path.join(projectRoot, "content", "guides");
const gamesDir = path.join(projectRoot, "content", "games");
const categoriesDir = path.join(projectRoot, "content", "categories");

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function yamlString(value) {
  return JSON.stringify(value);
}

function readGame(gameInput) {
  const requestedSlug = slugify(gameInput);
  const candidates = fs.existsSync(gamesDir)
    ? fs.readdirSync(gamesDir).filter((file) => file.endsWith(".json"))
    : [];

  for (const file of candidates) {
    const data = JSON.parse(fs.readFileSync(path.join(gamesDir, file), "utf8"));
    const fileSlug = file.replace(/\.json$/, "");
    if (fileSlug === requestedSlug || slugify(data.name || "") === requestedSlug) {
      return {
        slug: data.slug || fileSlug,
        name: data.name || gameInput,
        platforms: Array.isArray(data.platforms) ? data.platforms : []
      };
    }
  }

  throw new Error(
    `Unknown game "${gameInput}". Add content/games/${requestedSlug}.json before generating this guide.`
  );
}

function assertCategory(category) {
  const categoryFile = path.join(categoriesDir, `${category}.json`);
  if (!fs.existsSync(categoryFile)) {
    throw new Error(
      `Unknown category "${category}". Add ${path.relative(projectRoot, categoryFile)} before generating this guide.`
    );
  }
}

function buildTemplate({ game, keyword, category }) {
  const keywordSlug = slugify(keyword);
  const slug = `${game.slug}-${keywordSlug}`;
  const topic = titleCase(keyword);
  const title = `${game.name} ${topic} Guide`;
  const today = new Date().toISOString().slice(0, 10);
  const platform = game.platforms.length ? game.platforms.join(", ") : "TBD";
  const heroImage = `/images/guides/${slug}.jpg`;
  const excerpt = `A practical ${game.name} guide for ${keyword}, with setup priorities, progression advice, and common mistakes to avoid.`;

  return {
    slug,
    content: `---
title: ${yamlString(title)}
slug: ${yamlString(slug)}
game: ${yamlString(game.slug)}
category: ${yamlString(category)}
difficulty: "Beginner"
author: "hayes"
reviewer: "hayes"
publishDate: ${yamlString(today)}
updatedDate: ${yamlString(today)}
heroImage: ${yamlString(heroImage)}
heroAlt: ${yamlString(`${game.name} ${keyword} guide hero image`)}
excerpt: ${yamlString(excerpt)}
platform: ${yamlString(platform)}
patch: "TBD - verify current patch before publication"
readingTime: "8 min read"
tags:
  - ${yamlString(keywordSlug)}
  - ${yamlString(category)}
featured: false
related: []
faq:
  - question: ${yamlString(`What should players know before using this ${game.name} guide?`)}
    answer: "Confirm the current patch, required unlocks, and recommended progression point before following the setup."
  - question: "Is this guide suitable for beginners?"
    answer: "Yes. The draft is structured around clear priorities, accessible options, and common mistakes to avoid."
seoTitle: ${yamlString(`${title} | GameVault Guides`)}
metaDescription: ${yamlString(excerpt)}
---

<!-- IMAGE PROMPT: Describe a clear, game-relevant hero image for ${title}. Avoid text overlays and copyrighted UI recreations. -->

<!-- EDITORIAL NOTES:
- Verify every recommendation against the current patch.
- Replace all TBD text and placeholders before publication.
- Add first-party screenshots or approved images when available.
- Confirm internal links and related guide slugs.
-->

## Quick Answer

Summarize the recommended approach for **${keyword}** in two or three direct paragraphs.

## What You Need Before Starting

- Required unlocks or progression
- Recommended level or account state
- Core items, characters, weapons, or resources

### Beginner-Friendly Alternative

Add a lower-cost or earlier-game option for players who do not have the ideal setup.

## Recommended Setup

Explain the complete setup, why each choice matters, and what can be substituted.

### Priority Order

1. First priority
2. Second priority
3. Third priority

## Step-by-Step Progression

Describe the route from the earliest accessible version to the finished setup.

### Early Game

Explain the first practical milestone.

### Mid Game

Explain the next upgrades and decision points.

### Late Game

Explain the optimized version and optional improvements.

## Common Mistakes

- Mistake one and how to avoid it
- Mistake two and how to avoid it
- Mistake three and how to avoid it

## Internal Links

<!-- INTERNAL LINKS PLACEHOLDER:
- Parent game: /games/${game.slug}
- Category: /categories/${category}
- Add 2-4 related guide links: /guides/[slug]
-->

## FAQ

### What should players know before using this guide?

Confirm the current patch, required unlocks, and recommended progression point before following the setup.

### Is this guide suitable for beginners?

Yes. Start with the accessible alternative, then upgrade toward the recommended setup as resources become available.

## Editorial Checklist

<!-- EDITORIAL NOTES PLACEHOLDER:
- [ ] Facts and patch references verified
- [ ] Frontmatter reviewed
- [ ] Hero image added and alt text checked
- [ ] Internal links replaced
- [ ] FAQ answers match frontmatter FAQ
- [ ] Related guide slugs added
- [ ] Draft reviewed by named reviewer
-->
`
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const missingArgs = ["game", "keyword", "category"].filter((key) => !args[key]);

    if (missingArgs.length) {
      throw new Error(
        `Missing required arguments: ${missingArgs.map((key) => `--${key}`).join(", ")}\n` +
          'Usage: node scripts/generate-guide-template.js --game "Elden Ring" --keyword "best strength build early game" --category "build-guide"'
      );
    }

    const game = readGame(args.game);
    const category = slugify(args.category);
    assertCategory(category);

    const draft = buildTemplate({
      game,
      keyword: args.keyword,
      category
    });

    fs.mkdirSync(guidesDir, { recursive: true });
    const outputPath = path.join(guidesDir, `${draft.slug}.mdx`);

    if (fs.existsSync(outputPath) && args.force !== "true") {
      throw new Error(
        `Guide already exists: ${path.relative(projectRoot, outputPath)}\nUse --force true to overwrite it intentionally.`
      );
    }

    fs.writeFileSync(outputPath, draft.content, "utf8");
    console.log(`Created ${path.relative(projectRoot, outputPath)}`);
    console.log("Next: replace placeholders, verify facts, then run npm run content:check");
  } catch (error) {
    console.error(`Guide generation failed:\n${error.message}`);
    process.exitCode = 1;
  }
}

main();
