import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

type CliOptions = {
  game: string;
  keyword: string;
  category: string;
  difficulty: string;
  patch: string;
  force: boolean;
};

type GameData = {
  slug: string;
  name: string;
  description: string;
  platforms: string[];
  genre: string;
};

type CategoryData = {
  slug: string;
  name: string;
  description: string;
};

type ExistingGuide = {
  slug: string;
  title: string;
  game: string;
  category: string;
  heroImage: string;
};

const projectRoot = process.cwd();
const contentDirectory = path.join(projectRoot, "content");
const guidesDirectory = path.join(contentDirectory, "guides");

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function yamlString(value: string) {
  return JSON.stringify(value);
}

function parseArguments(argv: string[]): CliOptions {
  const values: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    values[key] = value;
    index += 1;
  }

  const missing = ["game", "keyword", "category"].filter((key) => !values[key]);
  if (missing.length) {
    throw new Error(`Missing required arguments: ${missing.map((key) => `--${key}`).join(", ")}`);
  }

  return {
    game: values.game,
    keyword: values.keyword,
    category: values.category,
    difficulty: values.difficulty || "Beginner",
    patch: values.patch || "Latest editorial review",
    force: values.force === "true"
  };
}

function readJsonFiles<T>(directory: string): Array<T & { slug: string }> {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")) as T;
      return {
        slug: file.replace(/\.json$/, ""),
        ...data
      };
    });
}

function findBySlugOrName<T extends { slug: string; name: string }>(
  items: T[],
  input: string,
  label: string
) {
  const requested = slugify(input);
  const item = items.find(
    (candidate) => candidate.slug === requested || slugify(candidate.name) === requested
  );

  if (!item) {
    throw new Error(`Unknown ${label} "${input}". Add it to content/${label === "game" ? "games" : "categories"} first.`);
  }

  return item;
}

function readExistingGuides(): ExistingGuide[] {
  if (!fs.existsSync(guidesDirectory)) return [];

  return fs
    .readdirSync(guidesDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const source = fs.readFileSync(path.join(guidesDirectory, file), "utf8");
      const { data } = matter(source);

      return {
        slug: data.slug || file.replace(/\.mdx$/, ""),
        title: data.title || "",
        game: data.game || "",
        category: data.category || "",
        heroImage: data.heroImage || data.coverImage || ""
      };
    });
}

function buildTags(keyword: string, category: string) {
  const ignored = new Set(["the", "a", "an", "and", "or", "for", "of", "in"]);
  const keywordTags = keyword
    .toLowerCase()
    .split(/\s+/)
    .map(slugify)
    .filter((word) => word.length > 2 && !ignored.has(word));

  return Array.from(new Set([category, ...keywordTags])).slice(0, 6);
}

function buildDraft(
  options: CliOptions,
  game: GameData,
  category: CategoryData,
  existingGuides: ExistingGuide[]
) {
  const keywordTitle = titleCase(options.keyword);
  const slug = `${game.slug}-${slugify(options.keyword)}`;
  const title = `${game.name} ${keywordTitle} Guide`;
  const today = new Date().toISOString().slice(0, 10);
  const platform = game.platforms.join(", ");
  const excerpt = `A structured ${game.name} guide to ${options.keyword}, covering preparation, progression, practical priorities, and common mistakes.`;
  const related = existingGuides
    .filter((guide) => guide.game === game.slug || guide.category === category.slug)
    .map((guide) => guide.slug)
    .slice(0, 3);
  const heroImage =
    existingGuides.find((guide) => guide.game === game.slug && guide.heroImage)?.heroImage ||
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=85";
  const tags = buildTags(options.keyword, category.slug);

  const relatedYaml = related.length
    ? `\n${related.map((item) => `  - ${yamlString(item)}`).join("\n")}`
    : " []";

  const body = `## Quick Answer

The best approach to **${options.keyword}** in ${game.name} starts with a clear goal, a limited upgrade plan, and a route that avoids spending resources on options that will be replaced immediately. Use this draft as a practical framework, then verify any patch-sensitive values inside the game before publication.

For a ${options.difficulty.toLowerCase()} player, consistency matters more than theoretical maximum performance. Prioritize tools that are available at the intended progression point, work across common encounters, and remain useful while the rest of the setup is still incomplete.

## Before You Start

### Confirm Your Progression Point

Check which areas, systems, vendors, characters, or upgrade materials are currently available. A strong guide should distinguish between an option that is technically obtainable and one that is reasonable for the target audience.

### Protect Limited Resources

Avoid committing rare upgrade materials until the core setup has been tested. Build the first usable version with replaceable resources, confirm that its playstyle fits the intended goal, and then invest in permanent upgrades.

### Set a Practical Benchmark

Choose a repeatable encounter or route for testing. Measure whether the setup improves reliability, recovery, resource use, and completion time instead of judging it only by a single high-damage result.

## Recommended Priorities

### Core Setup

Start with the minimum pieces required to make the strategy function. The core should be easy to understand and should not depend on perfect execution. If one item, character, or upgrade is unavailable, use an alternative that preserves the same role.

### Upgrade Order

1. Meet the minimum requirements for the core setup.
2. Improve survivability and resource efficiency.
3. Upgrade the primary source of damage or progression value.
4. Add secondary bonuses only after the core is stable.
5. Test each major change before spending the next limited resource.

### Flexible Alternatives

Keep at least one accessible alternative for every rare component. A useful substitute should solve the same problem, even when its final output is lower. This makes the route usable for new saves, unlucky accounts, and players who skipped optional content.

## Step-by-Step Progression

### Early Version

Assemble the simplest version of the strategy using items and upgrades available near the start of the intended route. Focus on clean fundamentals: positioning, stamina or resource control, safe openings, and a repeatable sequence of actions.

### Mid-Progression Improvements

Replace temporary pieces one at a time. Prioritize upgrades that improve multiple encounters rather than narrow bonuses that work only in ideal conditions. Recheck equipment requirements and resource costs after each change.

### Final Version

The finished setup should preserve the same basic play pattern as the early version while improving efficiency, safety, and flexibility. Optional optimizations belong here, after the guide's core recommendation is already complete and usable.

## How to Use the Setup

### Standard Encounters

Use a conservative opening, identify the safest repeatable action, and avoid spending every resource at once. The goal is to finish ordinary encounters with enough health, stamina, energy, ammunition, or consumables for the next objective.

### Difficult Encounters

Reduce the sequence to its safest components. Learn which actions can be interrupted, where recovery is possible, and when the strategy should switch from pressure to defense. Reliability is more valuable than forcing a perfect rotation.

### Exploration and Farming

Favor movement speed, sustain, inventory efficiency, and low-cost actions. A setup that performs well against a boss may need small adjustments for repeated routes or groups of weaker enemies.

## Common Mistakes

### Upgrading Too Many Options

Spreading resources across several competing setups slows progression. Choose one primary route and keep alternatives at a functional, low-investment level until the core is complete.

### Copying an Endgame Setup Too Early

An optimized final build may rely on upgrades or interactions that do not exist during early progression. Use the early version described above instead of copying only the final equipment list.

### Ignoring Defensive Value

Damage that cannot be delivered safely has little practical value. Include enough survivability, recovery, or control to keep the strategy consistent during unfamiliar encounters.

### Skipping Patch Verification

The requested patch label is **${options.patch}**. Before publication, verify names, requirements, balance-sensitive recommendations, and availability against the current game version.

## Internal Links

- Browse the [${game.name} guide hub](/games/${game.slug}) for more routes and strategy.
- Explore more [${category.name}](/categories/${category.slug}) articles.
${related
  .map((relatedSlug) => {
    const guide = existingGuides.find((item) => item.slug === relatedSlug);
    return guide ? `- Read [${guide.title}](/guides/${guide.slug}).` : "";
  })
  .filter(Boolean)
  .join("\n")}

## FAQ

### Is this guide suitable for beginners?

Yes. The structure begins with an accessible core and delays expensive optimization until the main strategy is stable.

### What should I upgrade first?

Upgrade the component that makes the strategy function, then improve survivability and resource efficiency before investing in optional bonuses.

### Can I use alternatives?

Yes. Choose alternatives that preserve the same role, such as damage type, support function, defensive value, or resource generation.

### How should I handle patch changes?

Recheck balance-sensitive recommendations, requirements, and availability whenever the game receives a major update. Keep the route structure, but revise individual choices when the patch changes their practical value.

## Editorial Notes

- Verify all game-specific names, locations, requirements, and numerical claims before publication.
- Replace general recommendations with tested examples where reliable local research is available.
- Confirm the ${options.patch} patch label and update the frontmatter date after review.
`;

  const content = `---
title: ${yamlString(title)}
slug: ${yamlString(slug)}
game: ${yamlString(game.slug)}
category: ${yamlString(category.slug)}
difficulty: ${yamlString(options.difficulty)}
author: "hayes"
reviewer: "hayes"
publishDate: ${yamlString(today)}
updatedDate: ${yamlString(today)}
heroImage: ${yamlString(heroImage)}
heroAlt: ${yamlString(`${game.name} ${options.keyword} guide hero image`)}
excerpt: ${yamlString(excerpt)}
platform: ${yamlString(platform)}
patch: ${yamlString(options.patch)}
readingTime: "8 min read"
tags:
${tags.map((tag) => `  - ${yamlString(tag)}`).join("\n")}
featured: false
related:${relatedYaml}
faq:
  - question: "Is this guide suitable for beginners?"
    answer: "Yes. It begins with an accessible core and delays expensive optimization until the main strategy is stable."
  - question: "What should I upgrade first?"
    answer: "Upgrade the component that makes the strategy function, then improve survivability and resource efficiency."
  - question: "Can I use alternatives?"
    answer: "Yes. Choose alternatives that preserve the same practical role in the setup."
  - question: "How should I handle patch changes?"
    answer: "Recheck balance-sensitive recommendations, requirements, and availability after major updates."
seoTitle: ${yamlString(`${keywordTitle} - ${game.name} | GameVault Guides`)}
metaDescription: ${yamlString(excerpt)}
imagePrompt: ${yamlString(`A cinematic, text-free ${game.genre} scene inspired by ${game.name}, focused on ${options.keyword}, clear subject, readable composition, dark blue technology accents, 16:9`)}
editorialNotes:
  - "Verify all game-specific facts before publication."
  - ${yamlString(`Confirm recommendations against ${options.patch}.`)}
---

${body}`;

  return { slug, content };
}

function runNpmScript(script: string) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  console.log(`Running npm run ${script}...`);
  const result = spawnSync(npmCommand, ["run", script], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false
  });

  if (result.error) {
    throw new Error(`Unable to run npm run ${script}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`npm run ${script} failed with exit code ${result.status}.`);
  }
}

function main() {
  let outputPath: string | undefined;
  let previousContent: string | undefined;

  try {
    const options = parseArguments(process.argv.slice(2));
    const games = readJsonFiles<Omit<GameData, "slug">>(path.join(contentDirectory, "games"));
    const categories = readJsonFiles<Omit<CategoryData, "slug">>(
      path.join(contentDirectory, "categories")
    );
    const game = findBySlugOrName(games, options.game, "game");
    const category = findBySlugOrName(categories, options.category, "category");
    const existingGuides = readExistingGuides();
    const draft = buildDraft(options, game, category, existingGuides);

    outputPath = path.join(guidesDirectory, `${draft.slug}.mdx`);
    if (fs.existsSync(outputPath)) {
      if (!options.force) {
        throw new Error(
          `Guide already exists: ${path.relative(projectRoot, outputPath)}. Use --force true to replace it.`
        );
      }
      previousContent = fs.readFileSync(outputPath, "utf8");
    }

    fs.mkdirSync(guidesDirectory, { recursive: true });
    fs.writeFileSync(outputPath, draft.content, "utf8");
    console.log(`Created ${path.relative(projectRoot, outputPath)}`);

    try {
      runNpmScript("content:check");
      runNpmScript("build");
    } catch (error) {
      if (previousContent !== undefined) {
        fs.writeFileSync(outputPath, previousContent, "utf8");
      } else if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      throw new Error(
        `${error instanceof Error ? error.message : String(error)} Generated file was rolled back.`
      );
    }
  } catch (error) {
    console.error(
      `Offline guide generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

main();
