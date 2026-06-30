import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const keywordSources = [
  "manual",
  "search-console",
  "reddit",
  "people-also-ask",
  "google-suggest"
] as const;

export type KeywordSource = (typeof keywordSources)[number];
export type KeywordStatus = "pending" | "completed";

export type KeywordIdea = {
  keyword: string;
  game: string;
  category: string;
  difficulty: string;
  priority: number;
  status: KeywordStatus;
  source: KeywordSource;
  order: number;
};

const projectRoot = process.cwd();
const todoPath = path.join(projectRoot, "content", "todo", "todo.csv");
const guidesDirectory = path.join(projectRoot, "content", "guides");
const requiredColumns = [
  "keyword",
  "game",
  "category",
  "difficulty",
  "priority",
  "status",
  "source"
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCsv(source: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
      } else field += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else field += character;
  }

  if (quoted) throw new Error("todo.csv contains an unclosed quoted field.");
  if (field.length || record.length) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }
  return records.filter((row) => row.some((value) => value.trim()));
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeStatus(value: string): KeywordStatus {
  return value.trim().toLowerCase() === "completed" ? "completed" : "pending";
}

function normalizeSource(value: string): KeywordSource {
  const source = value.trim().toLowerCase();
  if (!keywordSources.includes(source as KeywordSource)) {
    throw new Error(
      `Unsupported keyword source "${value}". Supported sources: ${keywordSources.join(", ")}.`
    );
  }
  return source as KeywordSource;
}

export function readKeywordIdeas(): KeywordIdea[] {
  if (!fs.existsSync(todoPath)) return [];
  const records = parseCsv(fs.readFileSync(todoPath, "utf8"));
  if (!records.length) return [];

  const headers = records[0].map((header) => header.trim());
  const missing = requiredColumns.filter((column) => !headers.includes(column));
  if (missing.length) {
    throw new Error(`content/todo/todo.csv is missing columns: ${missing.join(", ")}.`);
  }

  return records.slice(1).map((values, index) => {
    const row = Object.fromEntries(
      headers.map((header, valueIndex) => [header, values[valueIndex] || ""])
    );
    const priority = Number.parseFloat(row.priority);
    if (!row.keyword.trim() || !row.game.trim() || !row.category.trim()) {
      throw new Error(`content/todo/todo.csv row ${index + 2} is incomplete.`);
    }
    if (!Number.isFinite(priority) || priority <= 0) {
      throw new Error(`content/todo/todo.csv row ${index + 2} has an invalid priority.`);
    }
    return {
      keyword: row.keyword.trim(),
      game: row.game.trim(),
      category: slugify(row.category),
      difficulty: row.difficulty.trim() || "beginner",
      priority,
      status: normalizeStatus(row.status),
      source: normalizeSource(row.source),
      order: index
    };
  });
}

function writeKeywordIdeas(ideas: KeywordIdea[]) {
  const lines = [
    requiredColumns.join(","),
    ...ideas.map((idea) =>
      [
        idea.keyword,
        idea.game,
        idea.category,
        idea.difficulty,
        idea.priority,
        idea.status,
        idea.source
      ]
        .map(escapeCsv)
        .join(",")
    )
  ];
  const temporaryPath = `${todoPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${lines.join("\n")}\n`, "utf8");
  fs.renameSync(temporaryPath, todoPath);
}

function readExistingGuides() {
  if (!fs.existsSync(guidesDirectory)) return [];
  return fs
    .readdirSync(guidesDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const parsed = matter(
        fs.readFileSync(path.join(guidesDirectory, file), "utf8")
      );
      return {
        slug: slugify(String(parsed.data.slug || file.replace(/\.mdx$/, ""))),
        game: slugify(String(parsed.data.game || "")),
        keyword: slugify(String(parsed.data.keyword || "")),
        title: slugify(String(parsed.data.title || ""))
      };
    });
}

function guideExists(idea: KeywordIdea, guides: ReturnType<typeof readExistingGuides>) {
  const game = slugify(idea.game);
  const keyword = slugify(idea.keyword);
  const expectedSlug = `${game}-${keyword}`;
  const terms = keyword.split("-").filter((term) => term.length > 2);

  return guides.some(
    (guide) =>
      guide.game === game &&
      (guide.slug === expectedSlug ||
        guide.keyword === keyword ||
        terms.every((term) => guide.title.includes(term)))
  );
}

export function scanKeywordIdeas() {
  const ideas = readKeywordIdeas();
  const guides = readExistingGuides();
  const completed: KeywordIdea[] = [];

  for (const idea of ideas) {
    if (idea.status === "pending" && guideExists(idea, guides)) {
      idea.status = "completed";
      completed.push(idea);
    }
  }
  if (completed.length) writeKeywordIdeas(ideas);

  return {
    ideas,
    completed,
    pending: ideas.filter((idea) => idea.status === "pending")
  };
}
