import OpenAI from "openai";
import matter from "gray-matter";

type ReviewDetails = {
  seoScore: number;
  topProblems: string[];
  duplicateWith?: string;
};

type RewriteGuideInput = {
  source: string;
  review: ReviewDetails;
};

const tocPattern =
  /^## Table of Contents[ \t]*\r?\n[\s\S]*?(?=^##[ \t]+|(?![\s\S]))/m;
const schemaPattern =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi;

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractInternalUrls(content: string) {
  return Array.from(
    new Set(
      Array.from(content.matchAll(/\[[^\]]+\]\((\/[^)]+)\)/g), (match) => match[1])
    )
  );
}

function wordCount(content: string) {
  return content
    .replace(/<[^>]+>/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/[^a-z0-9\s'-]/gi, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function cleanModelOutput(output: string) {
  let content = output.trim();
  content = content.replace(/^```(?:mdx|markdown)?\s*/i, "").replace(/\s*```$/, "");

  if (content.startsWith("---")) {
    const parsed = matter(content);
    content = parsed.content.trim();
  }

  return content.replace(tocPattern, "").trim();
}

function faqQuestionCount(content: string) {
  const faqSection = content.match(
    /^## Frequently Asked Questions[ \t]*\r?\n([\s\S]*?)(?=^##[ \t]+|(?![\s\S]))/m
  )?.[1];
  return faqSection?.match(/^###[ \t]+/gm)?.length || 0;
}

function validateRewrite(content: string, internalUrls: string[]) {
  const problems: string[] = [];
  const missingUrls = internalUrls.filter((url) => !content.includes(`](${url})`));

  if (/^#\s+/m.test(content)) problems.push("The rewrite contains an H1.");
  if (!/^##\s+Quick Answer\s*$/im.test(content)) {
    problems.push("Quick Answer section is missing.");
  }
  if (!/^##\s+Frequently Asked Questions\s*$/im.test(content)) {
    problems.push("FAQ section is missing.");
  }
  if (faqQuestionCount(content) < 5) {
    problems.push("The rewrite contains fewer than five FAQ questions.");
  }
  if (!/^##\s+(Conclusion|Final Recommendations|Final Takeaways)\s*$/im.test(content)) {
    problems.push("Conclusion section is missing.");
  }
  if ((content.match(/^##\s+/gm) || []).length < 6) {
    problems.push("The rewrite needs at least six H2 sections.");
  }
  if (wordCount(content) < 900) {
    problems.push("The rewrite is under 900 words.");
  }
  if (missingUrls.length) {
    problems.push(`Missing internal URLs: ${missingUrls.join(", ")}`);
  }

  if (problems.length) {
    throw new Error(`Rewrite validation failed: ${problems.join(" ")}`);
  }
}

function buildPrompt(
  data: Record<string, unknown>,
  body: string,
  review: ReviewDetails,
  internalUrls: string[]
) {
  const metadata = {
    title: stringValue(data.title),
    game: stringValue(data.game),
    category: stringValue(data.category),
    difficulty: stringValue(data.difficulty),
    keyword:
      stringValue(data.keyword) ||
      stringValue(data.slug)
        .replace(`${stringValue(data.game)}-`, "")
        .replace(/^best-/, ""),
    patch: stringValue(data.patch)
  };

  return `You are a senior game-guide editor rewriting an existing GameVault Guides article.

Metadata:
${JSON.stringify(metadata, null, 2)}

Current review score: ${review.seoScore}
Problems to fix:
${review.topProblems.map((problem) => `- ${problem}`).join("\n")}
${review.duplicateWith ? `The article is too similar to: ${review.duplicateWith}` : ""}

Rewrite the article naturally while preserving its search intent and factual caution.

Non-negotiable requirements:
- Return only the MDX article body. Do not return YAML frontmatter or code fences.
- Write at least 900 words.
- Do not use an H1.
- Keep an exact "## Quick Answer" section, but rewrite its language completely.
- Create a topic-specific H2/H3 structure that is meaningfully different from the source order.
- Vary sentence length, paragraph openings, transitions, and examples.
- Include practical steps, decision criteria, common mistakes, and patch-sensitive caveats.
- Include "## Internal Links" and preserve every URL listed below.
- Include "## Editorial Notes" without reducing author/reviewer/verification standards.
- Include "## Frequently Asked Questions" with at least five newly worded H3 questions and substantive answers.
- Add "## Conclusion", "## Final Recommendations", or "## Final Takeaways".
- Do not invent exact stats, item locations, patch effects, or mechanics that are not supported by the source.
- Do not include a Table of Contents; it will be regenerated after rewriting.
- Do not include JSON-LD script blocks; existing schema is preserved separately.

Internal URLs that must remain:
${internalUrls.map((url) => `- ${url}`).join("\n")}

Current article body:
${body}`;
}

export async function rewriteGuide({ source, review }: RewriteGuideInput) {
  const parsed = matter(source);
  const schemaBlocks = parsed.content.match(schemaPattern) || [];
  const body = parsed.content
    .replace(schemaPattern, "")
    .replace(tocPattern, "")
    .trim();
  const internalUrls = extractInternalUrls(body);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const client = new OpenAI({
    apiKey,
    timeout: 180_000,
    maxRetries: 2
  });
  const model =
    process.env.OPENAI_REWRITE_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4.1-mini";

  console.log(`Calling OpenAI rewrite model ${model}...`);
  const response = await client.responses.create({
    model,
    input: buildPrompt(parsed.data, body, review, internalUrls),
    max_output_tokens: 12_000
  });
  const rewrittenBody = cleanModelOutput(response.output_text || "");
  if (!rewrittenBody) {
    throw new Error("OpenAI returned an empty rewrite.");
  }
  validateRewrite(rewrittenBody, internalUrls);

  const separator = source.includes("\r\n") ? "\r\n" : "\n";
  const frontmatterMatch = /^(---\r?\n[\s\S]*?\r?\n---)/.exec(source);
  if (!frontmatterMatch) {
    throw new Error("Guide does not contain valid frontmatter.");
  }
  const preservedSchema = schemaBlocks.length
    ? `${separator}${separator}${schemaBlocks.join(`${separator}${separator}`)}`
    : "";

  return `${frontmatterMatch[1]}${separator}${separator}${rewrittenBody}${preservedSchema}${separator}`;
}
