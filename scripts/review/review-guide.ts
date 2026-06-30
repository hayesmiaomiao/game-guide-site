export const reviewCategories = [
  "title",
  "seo",
  "faq",
  "toc",
  "internalLinks",
  "image",
  "searchIntent",
  "readability",
  "duplicateRisk",
  "eeat"
] as const;

export type ReviewCategory = (typeof reviewCategories)[number];

export type ReviewCheck = {
  score: number;
  maxScore: number;
  problems: string[];
};

export type ReviewInput = {
  data: Record<string, unknown>;
  content: string;
  fileExists: boolean;
  duplicateSimilarity: number;
  duplicateWith?: string;
};

export type GuideReview = {
  slug: string;
  title: string;
  game: string;
  seoScore: number;
  reviewStatus: "Approved" | "Needs Rewrite";
  needsRewrite: boolean;
  topProblems: string[];
  duplicateSimilarity: number;
  duplicateWith?: string;
  checks: Record<ReviewCategory, ReviewCheck>;
};

type Criterion = {
  pass: boolean;
  points: number;
  problem: string;
};

type ProblemWithWeight = {
  problem: string;
  weight: number;
};

function scoreCriteria(maxScore: number, criteria: Criterion[]) {
  const score = criteria.reduce(
    (total, criterion) => total + (criterion.pass ? criterion.points : 0),
    0
  );
  const weightedProblems = criteria
    .filter((criterion) => !criterion.pass)
    .map((criterion) => ({
      problem: criterion.problem,
      weight: criterion.points
    }));

  return {
    check: {
      score: Math.min(score, maxScore),
      maxScore,
      problems: weightedProblems.map((item) => item.problem)
    },
    weightedProblems
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stripMarkdown(content: string) {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveSearchTerms(data: Record<string, unknown>) {
  const raw = [
    stringValue(data.keyword),
    stringValue(data.slug)
      .replace(`${stringValue(data.game)}-`, "")
      .replace(/^best-/, ""),
    stringValue(data.category)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const ignored = new Set([
    "best",
    "guide",
    "guides",
    "elden",
    "ring",
    "honkai",
    "star",
    "rail",
    "the",
    "legend",
    "zelda",
    "tears",
    "kingdom"
  ]);

  return Array.from(
    new Set(
      raw
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 2 && !ignored.has(term))
    )
  ).slice(0, 5);
}

function getParagraphs(content: string) {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .split(/\r?\n\r?\n/)
    .map(stripMarkdown)
    .filter((paragraph) => paragraph && !paragraph.startsWith("#"));
}

export function reviewGuide(input: ReviewInput): GuideReview {
  const { data, content } = input;
  const title = stringValue(data.title);
  const slug = stringValue(data.slug);
  const game = stringValue(data.game);
  const seoTitle = stringValue(data.seoTitle);
  const metaDescription = stringValue(data.metaDescription);
  const excerpt = stringValue(data.excerpt);
  const heroImage = stringValue(data.image) || stringValue(data.heroImage);
  const heroAlt = stringValue(data.heroAlt);
  const faq = Array.isArray(data.faq)
    ? (data.faq as Array<{ question?: unknown; answer?: unknown }>)
    : [];
  const related = stringArray(data.related);
  const headings = content.match(/^#{2,3}\s+.+$/gm) || [];
  const internalLinks = Array.from(
    content.matchAll(/\[[^\]]+\]\((\/[^)]+)\)/g),
    (match) => match[1]
  );
  const tocBlock = content.match(
    /^##\s+Table of Contents\s*$([\s\S]*?)(?=^##\s+|(?![\s\S]))/im
  )?.[1];
  const tocLinks = tocBlock?.match(/\]\(#[^)]+\)/g) || [];
  const plainText = stripMarkdown(content);
  const words = plainText ? plainText.split(/\s+/) : [];
  const paragraphs = getParagraphs(content);
  const sentences = plainText
    .split(/[.!?]+(?:\s|$)/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const averageParagraphWords = paragraphs.length
    ? paragraphs.reduce(
        (sum, paragraph) => sum + paragraph.split(/\s+/).length,
        0
      ) / paragraphs.length
    : Number.POSITIVE_INFINITY;
  const averageSentenceWords = sentences.length
    ? words.length / sentences.length
    : Number.POSITIVE_INFINITY;
  const searchTerms = deriveSearchTerms(data);
  const titleLower = title.toLowerCase();
  const introLower = words.slice(0, 220).join(" ").toLowerCase();
  const gameTerms = game.split("-").filter((term) => term.length > 3);

  const titleResult = scoreCriteria(10, [
    {
      pass: title.length > 0,
      points: 2,
      problem: "Title is missing."
    },
    {
      pass: title.length >= 35 && title.length <= 70,
      points: 3,
      problem: "Title should be between 35 and 70 characters."
    },
    {
      pass: gameTerms.some((term) => titleLower.includes(term)),
      points: 2,
      problem: "Title does not clearly identify the game."
    },
    {
      pass: !/\b(\w+)\s+\1\b/i.test(title),
      points: 3,
      problem: "Title contains a duplicated word."
    }
  ]);

  const seoResult = scoreCriteria(20, [
    {
      pass: seoTitle.length > 0,
      points: 3,
      problem: "SEO title is missing."
    },
    {
      pass: seoTitle.length >= 30 && seoTitle.length <= 65,
      points: 4,
      problem: "SEO title should be between 30 and 65 characters."
    },
    {
      pass: metaDescription.length > 0,
      points: 3,
      problem: "Meta description is missing."
    },
    {
      pass: metaDescription.length >= 110 && metaDescription.length <= 165,
      points: 6,
      problem: "Meta description should be between 110 and 165 characters."
    },
    {
      pass: excerpt.length >= 70 && excerpt.length <= 220,
      points: 4,
      problem: "Excerpt should be between 70 and 220 characters."
    }
  ]);

  const faqResult = scoreCriteria(10, [
    {
      pass: faq.length >= 5,
      points: 5,
      problem: "Add at least five FAQ entries."
    },
    {
      pass:
        faq.length > 0 &&
        faq.every(
          (item) =>
            stringValue(item.question).length >= 12 &&
            stringValue(item.answer).length >= 35
        ),
      points: 3,
      problem: "FAQ questions or answers are too thin."
    },
    {
      pass: /^##\s+Frequently Asked Questions\s*$/im.test(content),
      points: 2,
      problem: "Frequently Asked Questions section is missing."
    }
  ]);

  const tocResult = scoreCriteria(8, [
    {
      pass: /^##\s+Table of Contents\s*$/im.test(content),
      points: 4,
      problem: "Table of Contents section is missing."
    },
    {
      pass: tocLinks.length >= 3,
      points: 4,
      problem: "Table of Contents needs at least three working entries."
    }
  ]);

  const linksResult = scoreCriteria(10, [
    {
      pass: internalLinks.length >= 3,
      points: 5,
      problem: "Add at least three internal links."
    },
    {
      pass: internalLinks.some(
        (link) => link.startsWith("/games/") || link.startsWith("/categories/")
      ),
      points: 3,
      problem: "Add a link to the game or category hub."
    },
    {
      pass:
        related.length > 0 ||
        internalLinks.some((link) => link.startsWith("/guides/")),
      points: 2,
      problem: "Add at least one related guide link."
    }
  ]);

  const imageResult = scoreCriteria(10, [
    {
      pass: heroImage.startsWith("/images/"),
      points: 2,
      problem: "Featured image path is missing or invalid."
    },
    {
      pass: heroAlt.length >= 12,
      points: 3,
      problem: "Featured image alt text is missing or too short."
    },
    {
      pass: input.fileExists,
      points: 5,
      problem: "Featured image file does not exist."
    }
  ]);

  const intentResult = scoreCriteria(10, [
    {
      pass: /^##\s+Quick Answer\s*$/im.test(content),
      points: 2,
      problem: "Add a concise Quick Answer section."
    },
    {
      pass:
        searchTerms.length > 0 &&
        searchTerms.some((term) => titleLower.includes(term)),
      points: 3,
      problem: "Title does not clearly match the primary search intent."
    },
    {
      pass:
        searchTerms.length > 0 &&
        searchTerms.some((term) => introLower.includes(term)),
      points: 2,
      problem: "Opening content does not answer the primary search intent."
    },
    {
      pass: /step-by-step|recommended|how to|priorit|route/i.test(content),
      points: 3,
      problem: "Guide needs a clearer actionable structure."
    }
  ]);

  const readabilityResult = scoreCriteria(10, [
    {
      pass: words.length >= 800,
      points: 4,
      problem: "Guide is under 800 words."
    },
    {
      pass: headings.length >= 8,
      points: 2,
      problem: "Add more descriptive H2/H3 headings."
    },
    {
      pass: averageParagraphWords <= 120,
      points: 2,
      problem: "Paragraphs are too long for easy scanning."
    },
    {
      pass: averageSentenceWords <= 28,
      points: 2,
      problem: "Sentence length is too high for clear reading."
    }
  ]);

  const duplicateScore =
    input.duplicateSimilarity <= 0.55
      ? 6
      : input.duplicateSimilarity <= 0.7
        ? 3
        : 0;
  const duplicateProblem =
    duplicateScore === 6
      ? []
      : [
          input.duplicateWith
            ? `Content is too similar to ${input.duplicateWith}.`
            : "Content has a high duplicate risk."
        ];
  const duplicateResult = {
    check: {
      score: duplicateScore,
      maxScore: 6,
      problems: duplicateProblem
    },
    weightedProblems: duplicateProblem.map((problem) => ({
      problem,
      weight: 6 - duplicateScore
    }))
  };

  const eeatResult = scoreCriteria(6, [
    {
      pass: stringValue(data.author).length > 0,
      points: 1,
      problem: "Author attribution is missing."
    },
    {
      pass: stringValue(data.reviewer).length > 0,
      points: 1,
      problem: "Reviewer attribution is missing."
    },
    {
      pass:
        stringValue(data.publishDate).length > 0 &&
        stringValue(data.updatedDate).length > 0,
      points: 1,
      problem: "Publish or updated date is missing."
    },
    {
      pass: stringValue(data.patch).length > 0,
      points: 1,
      problem: "Patch/version evidence is missing."
    },
    {
      pass: /^##\s+Editorial Notes\s*$/im.test(content),
      points: 1,
      problem: "Editorial verification notes are missing."
    },
    {
      pass: heroAlt.length > 0,
      points: 1,
      problem: "Image context is not documented."
    }
  ]);

  const checks: Record<ReviewCategory, ReviewCheck> = {
    title: titleResult.check,
    seo: seoResult.check,
    faq: faqResult.check,
    toc: tocResult.check,
    internalLinks: linksResult.check,
    image: imageResult.check,
    searchIntent: intentResult.check,
    readability: readabilityResult.check,
    duplicateRisk: duplicateResult.check,
    eeat: eeatResult.check
  };
  const seoScore = Object.values(checks).reduce(
    (total, check) => total + check.score,
    0
  );
  const weightedProblems: ProblemWithWeight[] = [
    ...titleResult.weightedProblems,
    ...seoResult.weightedProblems,
    ...faqResult.weightedProblems,
    ...tocResult.weightedProblems,
    ...linksResult.weightedProblems,
    ...imageResult.weightedProblems,
    ...intentResult.weightedProblems,
    ...readabilityResult.weightedProblems,
    ...duplicateResult.weightedProblems,
    ...eeatResult.weightedProblems
  ];
  const topProblems = weightedProblems
    .sort(
      (left, right) =>
        right.weight - left.weight || left.problem.localeCompare(right.problem)
    )
    .slice(0, 3)
    .map((item) => item.problem);
  const needsRewrite = seoScore < 90;

  return {
    slug,
    title,
    game,
    seoScore,
    reviewStatus: needsRewrite ? "Needs Rewrite" : "Approved",
    needsRewrite,
    topProblems,
    duplicateSimilarity: Number(input.duplicateSimilarity.toFixed(3)),
    duplicateWith: input.duplicateWith,
    checks
  };
}
