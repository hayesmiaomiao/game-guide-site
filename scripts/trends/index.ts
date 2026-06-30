import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  keywordSources,
  readKeywordIdeas,
  type KeywordIdea,
  type KeywordSource
} from "../../lib/keywords";
import type {
  TrendOpportunity,
  TrendReport,
  TrendSource
} from "../../lib/trends";
import type {
  SearchConsoleDataset,
  SearchConsoleRow
} from "../../lib/search-console/types";

const root = process.cwd();
const reportPath = path.join(root, "data", "trends", "trend-report.json");
const historyPath = path.join(root, "data", "trends", "trend-history.json");
const sourceConfigPath = path.join(root, "content", "trends", "sources.json");
const guidesDirectory = path.join(root, "content", "guides");
const gamesDirectory = path.join(root, "content", "games");
const todoPath = path.join(root, "content", "todo", "todo.csv");
const searchConsolePath = path.join(root, "data", "search-console.json");

type RawOpportunity = {
  title: string;
  game?: string;
  category?: string;
  difficulty?: string;
  source: TrendSource;
  popularity: number;
  freshness: number;
  commercialValue: number;
  rank?: number;
  backlog?: KeywordIdea;
};

type SourceResult = {
  source: TrendSource;
  status: "ok" | "skipped" | "failed";
  message: string;
  items: RawOpportunity[];
};

type TrendHistory = {
  version: 1;
  ignored: string[];
  runs: Array<{
    date: string;
    generatedAt: string;
    opportunities: Array<{ id: string; score: number }>;
  }>;
};

type SourceConfig = {
  region?: string;
  maxItemsPerSource?: number;
  sources?: Array<{ id: TrendSource; enabled: boolean }>;
};

type GuideIndex = {
  slug: string;
  title: string;
  game: string;
  tokens: Set<string>;
};

type GameIndex = {
  slug: string;
  name: string;
};

const ignoredWords = new Set([
  "best",
  "game",
  "gaming",
  "guide",
  "guides",
  "how",
  "new",
  "the",
  "this",
  "with",
  "your"
]);

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

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
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !ignoredWords.has(word))
  );
}

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readGames(): GameIndex[] {
  if (!fs.existsSync(gamesDirectory)) return [];
  return fs
    .readdirSync(gamesDirectory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const value = readJson<{ name?: string; slug?: string }>(
        path.join(gamesDirectory, file),
        {}
      );
      return {
        slug: value.slug || file.replace(/\.json$/, ""),
        name: value.name || titleCase(file.replace(/\.json$/, ""))
      };
    });
}

function readGuides(): GuideIndex[] {
  if (!fs.existsSync(guidesDirectory)) return [];
  return fs
    .readdirSync(guidesDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const parsed = matter(
        fs.readFileSync(path.join(guidesDirectory, file), "utf8")
      );
      const title = String(parsed.data.title || file.replace(/\.mdx$/, ""));
      return {
        slug: slugify(String(parsed.data.slug || file.replace(/\.mdx$/, ""))),
        title,
        game: slugify(String(parsed.data.game || "")),
        tokens: tokens(
          `${title} ${String(parsed.data.keyword || "")} ${String(parsed.data.category || "")}`
        )
      };
    });
}

async function fetchText(url: string, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "GameVaultGuides-TrendEngine/1.0",
        ...headers
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function collect(
  source: TrendSource,
  enabled: boolean,
  collector: () => Promise<RawOpportunity[]>
): Promise<SourceResult> {
  if (!enabled) {
    return { source, status: "skipped", message: "Disabled", items: [] };
  }
  try {
    const items = await collector();
    return {
      source,
      status: "ok",
      message: items.length ? "Collected" : "No opportunities returned",
      items
    };
  } catch (error) {
    return {
      source,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
      items: []
    };
  }
}

async function googleTrends(region: string, limit: number) {
  const xml = await fetchText(
    `https://trends.google.com/trending/rss?geo=${encodeURIComponent(region)}`
  );
  return Array.from(xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/gi))
    .slice(0, limit)
    .map((match, index) => ({
      title: decodeEntities(match[1]),
      source: "google-trends" as const,
      popularity: clamp(100 - index * 4),
      freshness: 100,
      commercialValue: 55,
      rank: index + 1
    }));
}

async function steamSearch(
  source: "steam-top-sellers" | "steam-upcoming",
  filter: "topsellers" | "comingsoon",
  limit: number
) {
  const html = await fetchText(
    `https://store.steampowered.com/search/?filter=${filter}&category1=998`
  );
  return Array.from(
    html.matchAll(/<span[^>]*class="title"[^>]*>([\s\S]*?)<\/span>/gi)
  )
    .slice(0, limit)
    .map((match, index) => {
      const game = decodeEntities(match[1]);
      return {
        title: game,
        game,
        source,
        popularity: clamp(100 - index * 4),
        freshness: source === "steam-upcoming" ? 100 : 85,
        commercialValue: 95,
        rank: index + 1
      };
    });
}

async function steamMostPlayed(limit: number) {
  const raw = await fetchText(
    "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/"
  );
  const value = JSON.parse(raw) as {
    response?: { ranks?: Array<{ appid?: number; rank?: number }> };
  };
  const ranks = (value.response?.ranks ?? []).slice(0, Math.min(limit, 10));
  const games = await Promise.all(
    ranks.map(async (rank) => {
      const details = JSON.parse(
        await fetchText(
          `https://store.steampowered.com/api/appdetails?appids=${rank.appid}`
        )
      ) as Record<string, { success?: boolean; data?: { name?: string } }>;
      const game = details[String(rank.appid)]?.data?.name;
      return game
        ? {
            title: game,
            game,
            source: "steam-most-played" as const,
            popularity: clamp(100 - (Number(rank.rank || 1) - 1) * 4),
            freshness: 80,
            commercialValue: 85,
            rank: rank.rank
          }
        : null;
    })
  );
  return games.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function redditGaming(limit: number) {
  const raw = await fetchText(
    `https://www.reddit.com/r/gaming/hot.json?limit=${Math.min(limit, 25)}&raw_json=1`,
    { Accept: "application/json" }
  );
  const value = JSON.parse(raw) as {
    data?: {
      children?: Array<{
        data?: { title?: string; score?: number; stickied?: boolean };
      }>;
    };
  };
  return (value.data?.children ?? [])
    .filter((item) => item.data?.title && !item.data.stickied)
    .slice(0, limit)
    .map((item, index) => ({
      title: String(item.data?.title),
      source: "reddit-gaming" as const,
      popularity: clamp(
        Math.min(100, Math.log10(Number(item.data?.score || 1) + 1) * 25)
      ),
      freshness: 95,
      commercialValue: 40,
      rank: index + 1
    }));
}

async function youtubeGaming(region: string, limit: number) {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured");
  }
  const publishedAfter = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "viewCount");
  url.searchParams.set("q", "gaming guide update");
  url.searchParams.set("regionCode", region);
  url.searchParams.set("publishedAfter", publishedAfter);
  url.searchParams.set("maxResults", String(Math.min(limit, 25)));
  url.searchParams.set("key", apiKey);
  const value = JSON.parse(await fetchText(url.toString())) as {
    items?: Array<{ snippet?: { title?: string } }>;
  };
  return (value.items ?? []).map((item, index) => ({
    title: decodeEntities(String(item.snippet?.title || "")),
    source: "youtube-gaming" as const,
    popularity: clamp(95 - index * 3),
    freshness: 100,
    commercialValue: 50,
    rank: index + 1
  }));
}

function aggregateQueries(rows: SearchConsoleRow[]) {
  const timestamps = rows
    .map((row) => Number(new Date(`${row.date}T00:00:00Z`)))
    .filter(Number.isFinite);
  if (timestamps.length < 2) return [];
  const midpoint = Math.min(...timestamps) +
    (Math.max(...timestamps) - Math.min(...timestamps)) / 2;
  const queries = new Map<
    string,
    { previous: number; current: number; impressions: number }
  >();
  for (const row of rows) {
    if (!row.query) continue;
    const value = queries.get(row.query) ?? {
      previous: 0,
      current: 0,
      impressions: 0
    };
    if (Number(new Date(`${row.date}T00:00:00Z`)) <= midpoint) {
      value.previous += row.clicks;
    } else {
      value.current += row.clicks;
    }
    value.impressions += row.impressions;
    queries.set(row.query, value);
  }
  return Array.from(queries.entries())
    .map(([query, value]) => ({
      query,
      gain: value.current - value.previous,
      impressions: value.impressions
    }))
    .filter((item) => item.gain > 0 || item.impressions >= 100)
    .sort(
      (left, right) =>
        right.gain - left.gain || right.impressions - left.impressions
    );
}

function searchConsoleWinners(limit: number) {
  const data = readJson<SearchConsoleDataset>(searchConsolePath, {
    version: 1,
    siteUrl: "",
    syncedAt: "",
    startDate: "",
    endDate: "",
    rows: []
  });
  return aggregateQueries(data.rows)
    .slice(0, limit)
    .map((item, index) => ({
      title: item.query,
      source: "search-console-winners" as const,
      popularity: clamp(
        Math.min(100, item.gain * 8 + Math.log10(item.impressions + 1) * 18)
      ),
      freshness: 85,
      commercialValue: 65,
      rank: index + 1
    }));
}

function keywordBacklog(limit: number) {
  return readKeywordIdeas()
    .filter((idea) => idea.status === "pending")
    .sort(
      (left, right) =>
        left.priority - right.priority || left.order - right.order
    )
    .slice(0, limit)
    .map((idea) => ({
      title: idea.keyword,
      game: idea.game,
      category: idea.category,
      difficulty: idea.difficulty,
      source: "keyword-backlog" as const,
      popularity: clamp(95 - (idea.priority - 1) * 18),
      freshness: 60,
      commercialValue:
        idea.category === "build-guide" || idea.category === "tier-list"
          ? 80
          : 60,
      backlog: idea
    }));
}

function inferGame(title: string, supplied: string | undefined, games: GameIndex[]) {
  if (supplied) return supplied;
  const lower = title.toLowerCase();
  const match = [...games]
    .sort((left, right) => right.name.length - left.name.length)
    .find(
      (game) =>
        lower.includes(game.name.toLowerCase()) ||
        lower.includes(game.slug.replace(/-/g, " "))
    );
  return match?.name || "Gaming";
}

function inferCategory(title: string, supplied?: string) {
  if (supplied) return slugify(supplied);
  const value = title.toLowerCase();
  if (/\b(build|weapon|armor|loadout|class)\b/.test(value)) return "build-guide";
  if (/\b(boss|raid|fight)\b/.test(value)) return "boss-guide";
  if (/\b(map|location|route|farming|farm)\b/.test(value)) return "map-guide";
  if (/\b(quest|npc|mission)\b/.test(value)) return "quest-guide";
  if (/\b(tier|ranking|characters?)\b/.test(value)) return "tier-list";
  if (/\b(walkthrough|ending|chapter|progression)\b/.test(value)) {
    return "walkthrough";
  }
  return "beginner-guide";
}

function inferDifficulty(category: string, supplied?: string) {
  if (supplied) return supplied;
  return category === "boss-guide" || category === "build-guide"
    ? "intermediate"
    : "beginner";
}

function searchIntent(category: string) {
  const values: Record<string, string> = {
    "build-guide": "Find an effective setup and progression path",
    "boss-guide": "Beat a difficult encounter",
    "map-guide": "Locate items and follow an efficient route",
    "quest-guide": "Complete objectives without missing steps",
    "tier-list": "Compare options before investing resources",
    walkthrough: "Follow the correct progression order",
    "beginner-guide": "Learn what to do first"
  };
  return values[category] || "Find practical game guidance";
}

function publishSuggestion(title: string, game: string, category: string) {
  const topic = slugify(title) === slugify(game) ? "" : title;
  if (!topic) return `${game} Beginner Guide: What to Know Before You Start`;
  if (category === "tier-list") return `${game} ${topic} Tier List`;
  if (category === "boss-guide") return `${game} ${topic} Boss Guide`;
  if (category === "build-guide") return `${game} ${topic} Build Guide`;
  if (category === "map-guide") return `${game} ${topic} Map and Route Guide`;
  if (category === "quest-guide") return `${game} ${topic} Quest Walkthrough`;
  if (category === "walkthrough") return `${game} ${topic} Walkthrough`;
  return `${game} ${topic} Beginner Guide`;
}

function coverageFor(
  title: string,
  game: string,
  guides: GuideIndex[],
  backlog: KeywordIdea[]
) {
  const targetTokens = tokens(title);
  const gameSlug = slugify(game);
  const inBacklog = backlog.some(
    (idea) =>
      slugify(idea.game) === gameSlug &&
      slugify(idea.keyword) === slugify(title)
  );
  let strongest = 0;

  for (const guide of guides) {
    if (gameSlug !== "gaming" && guide.game !== gameSlug) continue;
    let matches = 0;
    for (const token of Array.from(targetTokens)) {
      if (guide.tokens.has(token)) matches += 1;
    }
    const ratio = targetTokens.size ? matches / targetTokens.size : 0;
    strongest = Math.max(strongest, ratio);
  }

  return {
    alreadyCovered: strongest >= 0.8,
    inBacklog,
    existingCoverage: clamp(100 - strongest * 100)
  };
}

function competitionFor(source: TrendSource, rank = 10) {
  const bases: Record<TrendSource, number> = {
    "google-trends": 80,
    "steam-top-sellers": 72,
    "steam-most-played": 82,
    "steam-upcoming": 48,
    "reddit-gaming": 38,
    "youtube-gaming": 62,
    "search-console-winners": 42,
    "keyword-backlog": 45
  };
  return clamp(bases[source] + Math.max(0, 10 - rank));
}

function todoSource(source: TrendSource): KeywordSource {
  const mapped =
    source === "search-console-winners"
      ? "search-console"
      : source === "keyword-backlog"
        ? "manual"
        : source;
  return keywordSources.includes(mapped as KeywordSource)
    ? (mapped as KeywordSource)
    : "manual";
}

function normalize(
  raw: RawOpportunity,
  games: GameIndex[],
  guides: GuideIndex[],
  backlog: KeywordIdea[],
  ignored: Set<string>
): TrendOpportunity {
  const title = decodeEntities(raw.title);
  const game = inferGame(title, raw.game, games);
  const category = inferCategory(title, raw.category);
  const difficulty = inferDifficulty(category, raw.difficulty);
  const coverage = coverageFor(title, game, guides, backlog);
  const competition = competitionFor(raw.source, raw.rank);
  const commercialValue = clamp(raw.commercialValue);
  const commercialIntent =
    commercialValue >= 75 ? "High" : commercialValue >= 50 ? "Medium" : "Low";
  const score = clamp(
    raw.popularity * 0.3 +
      (100 - competition) * 0.15 +
      raw.freshness * 0.2 +
      commercialValue * 0.15 +
      coverage.existingCoverage * 0.2
  );
  const id = `${raw.source}:${slugify(game)}:${slugify(title)}`;

  return {
    id,
    title,
    game,
    category,
    score,
    source: raw.source,
    difficulty,
    searchIntent: searchIntent(category),
    commercialIntent,
    publishSuggestion: publishSuggestion(title, game, category),
    popularity: clamp(raw.popularity),
    competition,
    freshness: clamp(raw.freshness),
    commercialValue,
    existingCoverage: coverage.existingCoverage,
    alreadyCovered: coverage.alreadyCovered,
    inBacklog: coverage.inBacklog || Boolean(raw.backlog),
    ignored: ignored.has(id),
    todoSource: todoSource(raw.source)
  };
}

function deduplicate(items: TrendOpportunity[]) {
  const seen = new Map<string, TrendOpportunity>();
  for (const item of items) {
    const key = `${slugify(item.game)}:${slugify(item.title)}`;
    const current = seen.get(key);
    if (!current || item.score > current.score) seen.set(key, item);
  }
  return Array.from(seen.values());
}

function writeJsonAtomic(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function updateHistory(history: TrendHistory, report: TrendReport) {
  const date = report.generatedAt.slice(0, 10);
  const run = {
    date,
    generatedAt: report.generatedAt,
    opportunities: report.opportunities
      .filter((item) => !item.alreadyCovered)
      .slice(0, 50)
      .map((item) => ({ id: item.id, score: item.score }))
  };
  const runs = history.runs.filter((item) => item.date !== date);
  runs.push(run);
  history.runs = runs.slice(-90);
  writeJsonAtomic(historyPath, history);
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function appendTodo(item: TrendOpportunity) {
  const ideas = readKeywordIdeas();
  const guides = readGuides();
  const liveCoverage = coverageFor(item.title, item.game, guides, ideas);
  const suggestionCoverage = coverageFor(
    item.publishSuggestion,
    item.game,
    guides,
    ideas
  );
  if (
    item.alreadyCovered ||
    liveCoverage.alreadyCovered ||
    suggestionCoverage.alreadyCovered
  ) {
    throw new Error("This opportunity is already covered by an existing guide.");
  }
  if (item.inBacklog) {
    throw new Error("This opportunity is already present in the keyword backlog.");
  }
  if (
    ideas.some(
      (idea) =>
        slugify(idea.game) === slugify(item.game) &&
        slugify(idea.keyword) === slugify(item.publishSuggestion)
    )
  ) {
    console.log("Opportunity is already present in content/todo/todo.csv.");
    return;
  }
  const priority = item.score >= 80 ? 1 : item.score >= 65 ? 2 : 3;
  const row = [
    item.publishSuggestion,
    item.game,
    item.category,
    item.difficulty,
    priority,
    "pending",
    item.todoSource
  ]
    .map(csvEscape)
    .join(",");
  fs.appendFileSync(todoPath, `${row}\n`, "utf8");
  console.log(`Added to todo.csv: ${item.publishSuggestion}`);
}

async function buildReport() {
  const config = readJson<SourceConfig>(sourceConfigPath, {});
  const limit = config.maxItemsPerSource || 20;
  const region = config.region || "US";
  const enabled = new Map(
    (config.sources ?? []).map((source) => [source.id, source.enabled])
  );
  const isEnabled = (source: TrendSource) => enabled.get(source) !== false;
  const history = readJson<TrendHistory>(historyPath, {
    version: 1,
    ignored: [],
    runs: []
  });
  const previousReport = readJson<TrendReport>(reportPath, {
    version: 1,
    generatedAt: "",
    summary: {
      total: 0,
      actionable: 0,
      alreadyCovered: 0,
      inBacklog: 0,
      averageScore: 0
    },
    sourceStatus: [],
    opportunities: []
  });
  const results = await Promise.all([
    collect("google-trends", isEnabled("google-trends"), () =>
      googleTrends(region, limit)
    ),
    collect("steam-top-sellers", isEnabled("steam-top-sellers"), () =>
      steamSearch("steam-top-sellers", "topsellers", limit)
    ),
    collect("steam-most-played", isEnabled("steam-most-played"), () =>
      steamMostPlayed(limit)
    ),
    collect("steam-upcoming", isEnabled("steam-upcoming"), () =>
      steamSearch("steam-upcoming", "comingsoon", limit)
    ),
    collect("reddit-gaming", isEnabled("reddit-gaming"), () =>
      redditGaming(limit)
    ),
    collect("youtube-gaming", isEnabled("youtube-gaming"), () =>
      youtubeGaming(region, limit)
    ),
    collect(
      "search-console-winners",
      isEnabled("search-console-winners"),
      async () => searchConsoleWinners(limit)
    ),
    collect("keyword-backlog", isEnabled("keyword-backlog"), async () =>
      keywordBacklog(limit)
    )
  ]);
  const guides = readGuides();
  const games = readGames();
  const backlog = readKeywordIdeas();
  const ignored = new Set(history.ignored);
  const freshOpportunities = results.flatMap((result) =>
    result.items.map((item) =>
      normalize(item, games, guides, backlog, ignored)
    )
  );
  const failedSources = new Set(
    results
      .filter((result) => result.status === "failed")
      .map((result) => result.source)
  );
  const fallbackOpportunities = previousReport.opportunities
    .filter((item) => failedSources.has(item.source))
    .map((item) => ({
      ...item,
      freshness: clamp(item.freshness - 5),
      score: clamp(item.score - 2),
      ignored: ignored.has(item.id)
    }));
  const opportunities = deduplicate(
    freshOpportunities.concat(fallbackOpportunities)
  ).sort(
    (left, right) =>
      Number(left.alreadyCovered) - Number(right.alreadyCovered) ||
      Number(left.ignored) - Number(right.ignored) ||
      Number(left.inBacklog) - Number(right.inBacklog) ||
      right.score - left.score ||
      left.title.localeCompare(right.title)
  );
  const actionable = opportunities.filter(
    (item) => !item.alreadyCovered && !item.ignored && !item.inBacklog
  );
  const report: TrendReport = {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      total: opportunities.length,
      actionable: actionable.length,
      alreadyCovered: opportunities.filter((item) => item.alreadyCovered).length,
      inBacklog: opportunities.filter((item) => item.inBacklog).length,
      averageScore: opportunities.length
        ? Math.round(
            opportunities.reduce((sum, item) => sum + item.score, 0) /
              opportunities.length
          )
        : 0
    },
    sourceStatus: results.map((result) => {
      const fallbackCount = fallbackOpportunities.filter(
        (item) => item.source === result.source
      ).length;
      return {
        source: result.source,
        status: result.status,
        count: result.items.length || fallbackCount,
        message: fallbackCount
          ? `${result.message}; using previous snapshot`
          : result.message
      };
    }),
    opportunities
  };
  writeJsonAtomic(reportPath, report);
  updateHistory(history, report);
  return report;
}

async function main() {
  const createIndex = process.argv.indexOf("--create");
  if (createIndex >= 0) {
    const id = process.argv[createIndex + 1];
    const report = readJson<TrendReport | null>(reportPath, null);
    const item = report?.opportunities.find((opportunity) => opportunity.id === id);
    if (!item) throw new Error(`Trend opportunity not found: ${id || "(missing id)"}`);
    appendTodo(item);
    return;
  }

  const ignoreIndex = process.argv.indexOf("--ignore");
  if (ignoreIndex >= 0) {
    const id = process.argv[ignoreIndex + 1];
    if (!id) throw new Error("Provide an opportunity id after --ignore.");
    const history = readJson<TrendHistory>(historyPath, {
      version: 1,
      ignored: [],
      runs: []
    });
    history.ignored = Array.from(new Set(history.ignored.concat(id)));
    writeJsonAtomic(historyPath, history);
    console.log(`Ignored trend opportunity: ${id}`);
    return;
  }

  const report = await buildReport();
  console.log(
    `Trend report generated: ${report.summary.actionable} actionable, ${report.summary.alreadyCovered} covered, ${report.summary.inBacklog} already in backlog.`
  );
  for (const source of report.sourceStatus) {
    console.log(
      `${source.status.toUpperCase().padEnd(7)} ${source.source.padEnd(24)} ${source.count.toString().padStart(3)} ${source.message}`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
