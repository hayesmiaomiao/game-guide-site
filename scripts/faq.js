const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const projectRoot = path.resolve(__dirname, "..");
const guidesDirectory = path.join(projectRoot, "content", "guides");
const gamesDirectory = path.join(projectRoot, "content", "games");
const faqHeadingPattern =
  /^## (?:Frequently Asked Questions|FAQ)[ \t]*\r?\n[\s\S]*?(?=^##[ \t]+|^---[ \t]*$|(?![\s\S]))/m;
const faqScriptPattern =
  /\r?\n<script\r?\n[ \t]+type="application\/ld\+json"\r?\n[ \t]+data-engine="faq"\r?\n[\s\S]*?\/>\r?\n?/m;

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
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function readGameNames() {
  const names = new Map();
  if (!fs.existsSync(gamesDirectory)) return names;

  for (const file of fs.readdirSync(gamesDirectory)) {
    if (!file.endsWith(".json")) continue;
    const data = JSON.parse(
      fs.readFileSync(path.join(gamesDirectory, file), "utf8")
    );
    const slug = data.slug || file.replace(/\.json$/, "");
    names.set(slug, data.name || titleCase(slug));
  }

  return names;
}

function inferKeyword(data, gameName) {
  if (data.keyword) return String(data.keyword);

  return String(data.title || "")
    .replace(new RegExp(`^${escapeRegExp(gameName)}\\s+`, "i"), "")
    .replace(/\s+Guide$/i, "")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFaq(data, gameName) {
  const keyword = inferKeyword(data, gameName);
  const topic = keyword || titleCase(data.category);
  const difficulty = String(data.difficulty || "Beginner");
  const category = slugify(data.category);

  if (category === "build-guide") {
    return [
      {
        question: `What is the best ${topic} in ${gameName}?`,
        answer: `The best ${topic} prioritizes a reliable core setup, sensible upgrade order, and equipment that is available at the intended progression point. Verify patch-sensitive choices before committing rare resources.`
      },
      {
        question: `Which weapon or core equipment is best for this ${gameName} build?`,
        answer: `Choose the weapon or core equipment that supports the build's main scaling and playstyle without requiring unavailable upgrades. Keep an accessible alternative until the final option is ready.`
      },
      {
        question: "What stats should I level first?",
        answer: `Meet the minimum requirements for the core setup first, then improve survivability and the build's primary scaling stat. Avoid spreading early levels across bonuses that do not support the main strategy.`
      },
      {
        question: `Is this ${difficulty.toLowerCase()} build beginner friendly?`,
        answer: `Yes, when assembled in stages. Start with the low-investment version, learn its basic sequence, and add expensive optimizations only after the setup feels consistent.`
      },
      {
        question: "Which accessories or supporting bonuses should I use?",
        answer: `Use supporting bonuses that improve the build's most frequent actions, resource efficiency, or survivability. Treat narrow maximum-damage bonuses as optional rather than mandatory.`
      }
    ];
  }

  if (category === "map-guide") {
    return [
      {
        question: `What is the most efficient route for ${topic} in ${gameName}?`,
        answer: `Use a route that begins near a reliable checkpoint, groups nearby objectives together, and leaves a clear return path. Adjust the order when your current unlocks make a different starting point safer.`
      },
      {
        question: "What should I prepare before following this route?",
        answer: `Bring enough healing, navigation tools, inventory space, and equipment for the enemies or environmental hazards expected along the route.`
      },
      {
        question: "Can beginners use this map route?",
        answer: `Yes. Beginners should unlock nearby checkpoints first, mark safe exits, and complete the route in shorter sections instead of attempting everything in one trip.`
      },
      {
        question: "How can I make the route faster?",
        answer: `Remove optional detours, use movement shortcuts you have already unlocked, and reset from the closest checkpoint after completing each cluster of objectives.`
      },
      {
        question: "Should I repeat this route after a patch?",
        answer: `Recheck item availability, enemy placement, rewards, and traversal changes after major updates. The route structure may remain useful even when individual stops change.`
      }
    ];
  }

  if (category === "walkthrough" || category === "quest-guide") {
    return [
      {
        question: `What is the recommended order for ${topic} in ${gameName}?`,
        answer: `Follow the main objectives in dependency order, complete missable interactions before leaving each area, and unlock nearby checkpoints before difficult encounters.`
      },
      {
        question: "Are there any missable steps?",
        answer: `Treat optional dialogue, branching choices, temporary areas, and one-time rewards as potentially missable. Review those steps before advancing the main objective.`
      },
      {
        question: "What should I prepare before starting?",
        answer: `Prepare healing, suitable equipment, free inventory space, and any key items required by the current objective. Save or rest near a convenient checkpoint when possible.`
      },
      {
        question: `Is this walkthrough suitable for ${difficulty.toLowerCase()} players?`,
        answer: `Yes. The route emphasizes safe checkpoints, clear objective order, and recovery opportunities rather than relying on perfect execution.`
      },
      {
        question: "How should patch changes be handled?",
        answer: `Verify objective requirements, dialogue triggers, encounter behavior, and rewards after major updates before treating the walkthrough as final.`
      }
    ];
  }

  return [
    {
      question: `What should players know about ${topic} in ${gameName}?`,
      answer: `Focus on the core objective, required unlocks, and the most reliable route before investing in optional optimization. Verify version-sensitive details against the current game.`
    },
    {
      question: `Is this guide suitable for ${difficulty.toLowerCase()} players?`,
      answer: `Yes. The guide can be followed from its accessible starting point, with advanced optimizations added only after the fundamentals are understood.`
    },
    {
      question: "What should I prioritize first?",
      answer: `Prioritize the requirement that makes the strategy or route function, followed by survivability, resource efficiency, and repeatable execution.`
    },
    {
      question: "Can I use alternative equipment or routes?",
      answer: `Yes. Use alternatives that preserve the same practical role, and replace them only when the preferred option becomes reasonably available.`
    },
    {
      question: "How often should this guide be updated?",
      answer: `Review the guide after major balance patches, content updates, progression changes, or discoveries that materially change the recommended approach.`
    }
  ];
}

function splitSource(source, filePath) {
  const match = /^(---\r?\n)([\s\S]*?)(\r?\n---)(\r?\n?)([\s\S]*)$/.exec(
    source
  );
  if (!match) {
    throw new Error(
      `${path.relative(projectRoot, filePath)} does not contain valid frontmatter.`
    );
  }

  return {
    opening: match[1],
    frontmatter: match[2],
    closing: match[3],
    separator: match[4] || "\n\n",
    body: match[5]
  };
}

function yamlString(value) {
  return JSON.stringify(value);
}

function buildFaqYaml(faq) {
  return [
    "faq:",
    ...faq.flatMap((item) => [
      `  - question: ${yamlString(item.question)}`,
      `    answer: ${yamlString(item.answer)}`
    ])
  ].join("\n");
}

function updateFrontmatter(frontmatter, faq) {
  const faqBlockPattern = /^faq:\r?\n(?:^[ \t]+.*(?:\r?\n|$))*/m;
  const nextFaq = buildFaqYaml(faq);

  if (faqBlockPattern.test(frontmatter)) {
    return frontmatter.replace(faqBlockPattern, `${nextFaq}\n`);
  }

  const seoTitleIndex = frontmatter.search(/^seoTitle:/m);
  if (seoTitleIndex >= 0) {
    return `${frontmatter.slice(0, seoTitleIndex)}${nextFaq}\n${frontmatter.slice(
      seoTitleIndex
    )}`;
  }

  return `${frontmatter.trimEnd()}\n${nextFaq}`;
}

function buildFaqSection(faq) {
  const content = faq
    .map(
      (item) =>
        `### ${item.question}\n\n${item.answer}`
    )
    .join("\n\n");

  return `## Frequently Asked Questions\n\n${content}\n`;
}

function updateBody(body, faq) {
  let cleanBody = body
    .replace(faqScriptPattern, "\n")
    .replace(faqHeadingPattern, "")
    .trimEnd();
  const faqContent = buildFaqSection(faq);

  const relatedIndex = cleanBody.search(
    /(?:\r?\n)?---\r?\n\r?\n## Related Guides/m
  );
  if (relatedIndex >= 0) {
    return `${cleanBody.slice(0, relatedIndex).trimEnd()}\n\n${faqContent}\n${cleanBody
      .slice(relatedIndex)
      .trimStart()}`;
  }

  return `${cleanBody}\n\n${faqContent}`;
}

function updateGuide(filePath, gameNames) {
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = matter(source);
  const gameSlug = slugify(parsed.data.game);
  const gameName = gameNames.get(gameSlug) || titleCase(gameSlug);
  const faq = buildFaq(parsed.data, gameName);
  const parts = splitSource(source, filePath);
  const frontmatter = updateFrontmatter(parts.frontmatter, faq);
  const body = updateBody(parts.body, faq);
  const nextSource = `${parts.opening}${frontmatter}${parts.closing}${parts.separator}${body.trimEnd()}\n`;

  if (nextSource === source) return false;

  fs.writeFileSync(filePath, nextSource, "utf8");
  return true;
}

function main() {
  try {
    if (!fs.existsSync(guidesDirectory)) {
      throw new Error("content/guides directory does not exist.");
    }

    const gameNames = readGameNames();
    const files = fs
      .readdirSync(guidesDirectory)
      .filter((file) => file.endsWith(".mdx"))
      .sort((left, right) => left.localeCompare(right));
    let updated = 0;

    for (const file of files) {
      const filePath = path.join(guidesDirectory, file);
      if (updateGuide(filePath, gameNames)) {
        updated += 1;
        console.log(`Updated ${path.relative(projectRoot, filePath)}`);
      }
    }

    console.log(
      `FAQ complete: ${files.length} guide(s) scanned, ${updated} file(s) updated.`
    );
  } catch (error) {
    console.error(
      `FAQ generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  }
}

main();
