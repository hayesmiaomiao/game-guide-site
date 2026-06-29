const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const matter = require("gray-matter");

const projectRoot = path.resolve(__dirname, "..");
const contentDir = path.join(projectRoot, "content");
const guidesDir = path.join(contentDir, "guides");
const gamesDir = path.join(contentDir, "games");
const categoriesDir = path.join(contentDir, "categories");
const tagsDir = path.join(contentDir, "tags");
const envPath = path.join(projectRoot, ".env");

function loadEnv() {
  if (!fs.existsSync(envPath)) {
    throw new Error(
      'Missing .env file. Create it in the project root with OPENAI_API_KEY="your-key".'
    );
  }

  const values = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  if (!values.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing or empty in the project root .env file.");
  }

  process.env.OPENAI_API_KEY = values.OPENAI_API_KEY;
  if (values.OPENAI_MODEL) process.env.OPENAI_MODEL = values.OPENAI_MODEL;
}

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

function yamlString(value) {
  return JSON.stringify(String(value));
}

function readJsonDirectory(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const slug = file.replace(/\.json$/, "");
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      return { slug, ...data };
    });
}

function readGuideContext() {
  if (!fs.existsSync(guidesDir)) return [];
  return fs
    .readdirSync(guidesDir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const source = fs.readFileSync(path.join(guidesDir, file), "utf8");
      const { data } = matter(source);
      return {
        slug: data.slug || file.replace(/\.mdx$/, ""),
        title: data.title || "",
        game: data.game || "",
        category: data.category || "",
        excerpt: data.excerpt || data.description || "",
        tags: Array.isArray(data.tags) ? data.tags : [],
        heroImage: data.heroImage || data.coverImage || ""
      };
    });
}

function findContentItem(items, input, type) {
  const requested = slugify(input);
  const item = items.find(
    (candidate) =>
      candidate.slug === requested || slugify(candidate.name || "") === requested
  );
  if (!item) {
    throw new Error(
      `Unknown ${type} "${input}". Add content/${type === "game" ? "games" : "categories"}/${requested}.json first.`
    );
  }
  return item;
}

function responseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const text = (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("");

  if (!text.trim()) throw new Error("OpenAI returned no text output.");
  return text;
}

function parseModelJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`OpenAI returned invalid structured JSON: ${error.message}`);
  }
}

function countWords(markdown) {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_`[\]()|-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function assertGeneratedContent(result, context) {
  const stringFields = [
    "title",
    "excerpt",
    "heroAlt",
    "readingTime",
    "seoTitle",
    "metaDescription",
    "imagePrompt",
    "body"
  ];
  for (const field of stringFields) {
    if (typeof result[field] !== "string" || !result[field].trim()) {
      throw new Error(`Generated content is missing a non-empty "${field}" value.`);
    }
  }

  if (!Array.isArray(result.tags) || result.tags.length < 3) {
    throw new Error('Generated content must contain at least three "tags".');
  }
  if (!Array.isArray(result.related)) {
    throw new Error('Generated content field "related" must be an array.');
  }
  if (!Array.isArray(result.faq) || result.faq.length < 4) {
    throw new Error('Generated content must contain at least four "faq" items.');
  }
  if (!Array.isArray(result.editorialNotes) || result.editorialNotes.length < 2) {
    throw new Error('Generated content must contain at least two "editorialNotes".');
  }

  result.faq.forEach((item, index) => {
    if (
      !item ||
      typeof item.question !== "string" ||
      !item.question.trim() ||
      typeof item.answer !== "string" ||
      !item.answer.trim()
    ) {
      throw new Error(`Generated faq[${index}] must contain a question and answer.`);
    }
  });

  const wordCount = countWords(result.body);
  if (wordCount < 2000 || wordCount > 3000) {
    throw new Error(`Generated body must contain 2000-3000 words; received ${wordCount}.`);
  }

  const bodyRequirements = [
    { pattern: /^##\s+/m, label: "H2 headings" },
    { pattern: /^###\s+/m, label: "H3 headings" },
    { pattern: /^##\s+FAQ\b/im, label: "an FAQ section" },
    { pattern: /^##\s+Internal Links\b/im, label: "an Internal Links section" }
  ];
  for (const requirement of bodyRequirements) {
    if (!requirement.pattern.test(result.body)) {
      throw new Error(`Generated body is missing ${requirement.label}.`);
    }
  }

  const forbiddenPlaceholders = [
    /\bTBD\b/i,
    /\bTODO\b/i,
    /\[insert\b/i,
    /\[add\b/i,
    /placeholder/i,
    /lorem ipsum/i
  ];
  for (const pattern of forbiddenPlaceholders) {
    if (
      pattern.test(result.body) ||
      pattern.test(result.imagePrompt) ||
      pattern.test(result.editorialNotes.join(" "))
    ) {
      throw new Error(`Generated content contains an obvious placeholder: ${pattern}.`);
    }
  }

  const unsafeMdx = [
    { pattern: /^(?:import|export)\s/m, label: "import/export statements" },
    { pattern: /<script\b/i, label: "script tags" },
    { pattern: /<[A-Z][A-Za-z0-9.]*(?:\s|\/?>)/, label: "JSX components" },
    { pattern: /\{(?:[^{}]|\{[^{}]*\})*\}/, label: "MDX JavaScript expressions" }
  ];
  for (const rule of unsafeMdx) {
    if (rule.pattern.test(result.body)) {
      throw new Error(`Generated body contains disallowed ${rule.label}.`);
    }
  }

  const gameLink = `/games/${context.game.slug}`;
  const categoryLink = `/categories/${context.category.slug}`;
  if (!result.body.includes(gameLink) || !result.body.includes(categoryLink)) {
    throw new Error(
      `Internal Links must include ${gameLink} and ${categoryLink}.`
    );
  }
}

function buildPrompt(context, retryReason = "") {
  const relevantGuides = context.guides
    .filter(
      (guide) =>
        guide.game === context.game.slug ||
        guide.category === context.category.slug ||
        guide.tags.some((tag) => context.keyword.toLowerCase().includes(String(tag).toLowerCase()))
    )
    .slice(0, 12);
  const availableTags = context.tags.map((tag) => `${tag.slug}: ${tag.name}`).join("\n");
  const guideList = relevantGuides.length
    ? relevantGuides
        .map(
          (guide) =>
            `- ${guide.slug} | ${guide.title} | ${guide.excerpt} | tags: ${guide.tags.join(", ")}`
        )
        .join("\n")
    : "No closely related guides exist yet.";

  return `Write a complete, publication-ready English game guide for GameVault Guides.

CONTENT BRIEF
Game: ${context.game.name}
Game slug: ${context.game.slug}
Platforms: ${(context.game.platforms || []).join(", ")}
Genre: ${context.game.genre || "Game"}
Keyword and search intent: ${context.keyword}
Guide slug: ${context.slug}
Category: ${context.category.name} (${context.category.slug})
Category purpose: ${context.category.description || ""}
Difficulty: ${context.difficulty}
Patch/version request: ${context.patch}
Target length: 2,200-2,700 words for the MDX body, never below 2,000 or above 3,000.

AVAILABLE TAG TAXONOMY
${availableTags || "No predefined tags. Use concise relevant tags."}

EXISTING GUIDES FOR INTERNAL LINKS AND RELATED FIELD
${guideList}

REQUIRED QUALITY
- Produce a real article, not a template, outline, writing instruction, or fill-in-the-blank draft.
- Give specific, actionable steps and explain tradeoffs.
- Use clear H2 and H3 sections with a useful progression from quick answer to setup, execution, optimization, mistakes, internal links, and FAQ.
- If patch is "latest", use web research to verify time-sensitive claims. Avoid unsupported patch claims.
- Do not fabricate precise stats, item locations, unlock conditions, quotes, or patch changes. Omit uncertain details or phrase them safely.
- The body must contain a "## Internal Links" section with natural Markdown links to [${context.game.name}](/games/${context.game.slug}) and [${context.category.name}](/categories/${context.category.slug}).
- Link related guides only when their exact slug appears in the existing guide list.
- The body must contain a "## FAQ" section with the same questions and materially equivalent answers as the faq JSON field.
- imagePrompt must be a concrete, production-ready, text-free hero image brief, not a placeholder.
- editorialNotes must contain real verification or maintenance instructions, not placeholders.
- related may only contain exact slugs from the existing guide list.
- seoTitle should be concise and include the main keyword intent.
- metaDescription should be compelling, accurate, and suitable for a search result.
- Return body as MDX without YAML frontmatter and without code fences.
${retryReason ? `\nRETRY CORRECTION\nThe previous response failed local validation: ${retryReason}\nRegenerate the entire result and correct this issue.` : ""}

Return JSON only and match the supplied schema exactly.`;
}

async function callOpenAI({ apiKey, model, prompt, useWebSearch }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240000);

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "developer",
            content:
              "You are a senior game guide editor. Write accurate, useful, publication-ready guides and follow the structured output schema exactly."
          },
          { role: "user", content: prompt }
        ],
        ...(useWebSearch ? { tools: [{ type: "web_search" }] } : {}),
        max_output_tokens: 16000,
        text: {
          format: {
            type: "json_schema",
            name: "gamevault_guide_v2",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "title",
                "excerpt",
                "heroAlt",
                "readingTime",
                "tags",
                "related",
                "faq",
                "seoTitle",
                "metaDescription",
                "imagePrompt",
                "editorialNotes",
                "body"
              ],
              properties: {
                title: { type: "string" },
                excerpt: { type: "string" },
                heroAlt: { type: "string" },
                readingTime: { type: "string" },
                tags: {
                  type: "array",
                  minItems: 3,
                  maxItems: 8,
                  items: { type: "string" }
                },
                related: {
                  type: "array",
                  items: { type: "string" }
                },
                faq: {
                  type: "array",
                  minItems: 4,
                  maxItems: 8,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["question", "answer"],
                    properties: {
                      question: { type: "string" },
                      answer: { type: "string" }
                    }
                  }
                },
                seoTitle: { type: "string" },
                metaDescription: { type: "string" },
                imagePrompt: { type: "string" },
                editorialNotes: {
                  type: "array",
                  minItems: 2,
                  maxItems: 8,
                  items: { type: "string" }
                },
                body: { type: "string" }
              }
            }
          }
        }
      })
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("OpenAI API request timed out after 240 seconds.");
    }
    throw new Error(`OpenAI API network request failed: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`OpenAI API request failed: ${detail}`);
  }
  if (data?.status === "incomplete") {
    const reason = data?.incomplete_details?.reason || "unknown reason";
    throw new Error(`OpenAI response was incomplete: ${reason}.`);
  }
  const refusal = (data?.output || [])
    .flatMap((item) => item.content || [])
    .find((item) => item.type === "refusal");
  if (refusal) {
    throw new Error(`OpenAI refused the generation request: ${refusal.refusal || "no reason provided"}`);
  }
  return parseModelJson(responseText(data));
}

function chooseHeroImage(game, guides) {
  const existing = guides.find(
    (guide) => guide.game === game.slug && /^https?:\/\//.test(guide.heroImage)
  );
  return (
    existing?.heroImage ||
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=85"
  );
}

function buildMdx(result, context) {
  const today = new Date().toISOString().slice(0, 10);
  const platform =
    Array.isArray(context.game.platforms) && context.game.platforms.length
      ? context.game.platforms.join(", ")
      : "Multi-platform";
  const knownGuideSlugs = new Set(context.guides.map((guide) => guide.slug));
  const knownTags = new Map(context.tags.map((tag) => [tag.slug, tag.slug]));
  const tags = Array.from(
    new Set(
      result.tags
        .map((tag) => slugify(tag))
        .filter(Boolean)
        .map((tag) => knownTags.get(tag) || tag)
    )
  ).slice(0, 8);
  const related = result.related.filter((slug) => knownGuideSlugs.has(slug));
  const faqYaml = result.faq
    .map(
      (item) =>
        `  - question: ${yamlString(item.question)}\n` +
        `    answer: ${yamlString(item.answer)}`
    )
    .join("\n");
  const editorialNotesYaml = result.editorialNotes
    .map((note) => `  - ${yamlString(note)}`)
    .join("\n");

  return `---
title: ${yamlString(result.title)}
slug: ${yamlString(context.slug)}
game: ${yamlString(context.game.slug)}
category: ${yamlString(context.category.slug)}
difficulty: ${yamlString(context.difficulty)}
author: "hayes"
reviewer: "hayes"
publishDate: ${yamlString(today)}
updatedDate: ${yamlString(today)}
heroImage: ${yamlString(chooseHeroImage(context.game, context.guides))}
heroAlt: ${yamlString(result.heroAlt)}
excerpt: ${yamlString(result.excerpt)}
platform: ${yamlString(platform)}
patch: ${yamlString(context.patch)}
readingTime: ${yamlString(result.readingTime)}
tags:
${tags.map((tag) => `  - ${yamlString(tag)}`).join("\n")}
featured: false
related: ${related.length ? "" : "[]"}
${related.map((slug) => `  - ${yamlString(slug)}`).join("\n")}
faq:
${faqYaml}
seoTitle: ${yamlString(result.seoTitle)}
metaDescription: ${yamlString(result.metaDescription)}
imagePrompt: ${yamlString(result.imagePrompt)}
editorialNotes:
${editorialNotesYaml}
---

${result.body.trim()}
`;
}

function runNpmScript(script) {
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

async function generateValidatedResult(context, apiKey, model) {
  let retryReason = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    console.log(`OpenAI generation attempt ${attempt}/2 using ${model}...`);
    const result = await callOpenAI({
      apiKey,
      model,
      prompt: buildPrompt(context, retryReason),
      useWebSearch: context.patch.toLowerCase() === "latest"
    });
    try {
      assertGeneratedContent(result, context);
      return result;
    } catch (error) {
      retryReason = error.message;
      if (attempt === 2) throw error;
      console.warn(`Attempt ${attempt} failed local quality checks: ${retryReason}`);
    }
  }
  throw new Error("OpenAI generation did not produce a valid result.");
}

async function main() {
  let outputPath;
  let previousContent;

  try {
    loadEnv();
    const args = parseArgs(process.argv.slice(2));
    const requiredArgs = ["game", "keyword", "category", "difficulty", "patch"];
    const missingArgs = requiredArgs.filter((key) => !args[key]);
    if (missingArgs.length) {
      throw new Error(
        `Missing required arguments: ${missingArgs.map((key) => `--${key}`).join(", ")}\n` +
          'Usage: npm run ai:guide -- --game "Elden Ring" --keyword "best strength build early game" --category "build-guide" --difficulty "beginner" --patch "latest"'
      );
    }

    const games = readJsonDirectory(gamesDir);
    const categories = readJsonDirectory(categoriesDir);
    const tags = readJsonDirectory(tagsDir);
    const guides = readGuideContext();
    const game = findContentItem(games, args.game, "game");
    const category = findContentItem(categories, args.category, "category");
    const slug = `${game.slug}-${slugify(args.keyword)}`;
    outputPath = path.join(guidesDir, `${slug}.mdx`);

    if (fs.existsSync(outputPath)) {
      if (args.force !== "true") {
        throw new Error(
          `Guide already exists: ${path.relative(projectRoot, outputPath)}\n` +
            "Use --force true only when you intentionally want to replace it."
        );
      }
      previousContent = fs.readFileSync(outputPath, "utf8");
    }

    const context = {
      game,
      category,
      tags,
      guides,
      keyword: args.keyword.trim(),
      difficulty: args.difficulty.trim(),
      patch: args.patch.trim(),
      slug
    };
    const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
    const generated = await generateValidatedResult(
      context,
      process.env.OPENAI_API_KEY,
      model
    );
    const mdx = buildMdx(generated, context);

    fs.mkdirSync(guidesDir, { recursive: true });
    fs.writeFileSync(outputPath, mdx, "utf8");
    console.log(
      `Created ${path.relative(projectRoot, outputPath)} (${countWords(generated.body)} words).`
    );

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
        `${error.message} The generated file was rolled back to keep the project valid.`
      );
    }

    console.log("AI Guide Generator V2 completed successfully.");
  } catch (error) {
    console.error(`AI guide generation failed:\n${error.message}`);
    process.exitCode = 1;
  }
}

main();
