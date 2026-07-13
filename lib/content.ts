import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { FALLBACK_GUIDE_IMAGE } from "@/lib/guide-images";
import { guideCategories, slugify } from "@/lib/site";

const contentDir = path.join(process.cwd(), "content");
const guideDir = path.join(contentDir, "guides");
const gameDir = path.join(contentDir, "games");
const authorDir = path.join(contentDir, "authors");
const categoryDir = path.join(contentDir, "categories");
const tagDir = path.join(contentDir, "tags");
const publicDir = path.join(process.cwd(), "public");

export type FaqItem = {
  question: string;
  answer: string;
};

export type Author = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  avatar: string;
  expertise: string[];
  socialLinks: Record<string, string>;
};

export type ContentTaxonomy = {
  slug: string;
  name: string;
  description: string;
};

export type Game = {
  slug: string;
  name: string;
  description: string;
  platforms: string[];
  genre: string;
  guideCount: number;
  coverImage: string;
  coverAlt: string;
  latestUpdated: string;
  categories: string[];
  guides?: Guide[];
};

export type GuideFrontmatter = {
  title: string;
  slug: string;
  game: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | string;
  author: string;
  reviewer: string;
  publishDate: string;
  updatedDate: string;
  heroImage: string;
  image?: string;
  coverImage?: string;
  heroAlt: string;
  imageAlt?: string;
  excerpt: string;
  platform: string;
  patch: string;
  readingTime: string;
  tags: string[];
  featured: boolean;
  related: string[];
  faq: FaqItem[];
  seoTitle: string;
  metaDescription: string;
};

export type Guide = GuideFrontmatter & {
  content: string;
  headings: { id: string; text: string; depth: number }[];
  gameName: string;
  categoryName: string;
  tagNames: string[];
  authorData?: Author;
  reviewerData?: Author;
  description: string;
  date: string;
  updated: string;
  coverImage: string;
  coverAlt: string;
};

function readJsonFiles<T>(dir: string): Array<T & { slug: string }> {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const slug = file.replace(/\.json$/, "");
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as T;
      return { slug, ...data };
    });
}

function getGuideFiles() {
  if (!fs.existsSync(guideDir)) return [];
  return fs.readdirSync(guideDir).filter((file) => file.endsWith(".mdx"));
}

function normalizeSlug(value: string | undefined, fallback = "") {
  return value ? slugify(value) : fallback;
}

function localImageExists(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  const pathname = value.split(/[?#]/, 1)[0];
  const resolved = path.resolve(publicDir, pathname.replace(/^\/+/, ""));
  if (!resolved.startsWith(`${publicDir}${path.sep}`)) return false;

  return fs.existsSync(resolved) && fs.statSync(resolved).isFile();
}

export function resolveGuideImage(data: Record<string, unknown>) {
  const candidates = [data.coverImage, data.heroImage, data.image, FALLBACK_GUIDE_IMAGE];
  const image = candidates.find(localImageExists);
  return typeof image === "string" ? image : FALLBACK_GUIDE_IMAGE;
}

function extractHeadings(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const match = /^(##|###)\s+(.+)$/.exec(line);
      if (!match) return null;
      const text = match[2].trim();
      return {
        id: slugify(text),
        text,
        depth: match[1].length
      };
    })
    .filter((heading): heading is { id: string; text: string; depth: number } => Boolean(heading));
}

function getGameMetaBySlug(slug: string) {
  return readJsonFiles<{ name: string; description: string; platforms: string[]; genre: string }>(gameDir).find(
    (game) => game.slug === slug
  );
}

function normalizeGuide(file: string): Guide {
  const fileSlug = file.replace(/\.mdx$/, "");
  const source = fs.readFileSync(path.join(guideDir, file), "utf8");
  const { data, content } = matter(source);
  const gameSlug = normalizeSlug(data.game, "unknown-game");
  const categorySlug = normalizeSlug(data.category, "uncategorized");
  const game = getGameMetaBySlug(gameSlug);
  const category = getAllCategories().find((item) => item.slug === categorySlug);
  const tags = (data.tags || []) as string[];
  const authorSlug = normalizeSlug(data.author, "hayes");
  const reviewerSlug = normalizeSlug(data.reviewer, authorSlug);
  const publishDate = data.publishDate || data.date || "";
  const updatedDate = data.updatedDate || data.updated || publishDate;
  const heroImage = resolveGuideImage(data);
  const image = typeof data.image === "string" ? data.image : undefined;
  const coverImage = typeof data.coverImage === "string" && localImageExists(data.coverImage)
    ? data.coverImage
    : heroImage;
  const heroAlt =
    data.heroAlt || data.imageAlt || data.coverAlt || `${data.title} cover image`;
  const imageAlt = data.imageAlt || heroAlt;
  const excerpt = data.excerpt || data.description || "";

  return {
    title: data.title,
    slug: data.slug || fileSlug,
    game: gameSlug,
    category: categorySlug,
    difficulty: data.difficulty || "Beginner",
    author: authorSlug,
    reviewer: reviewerSlug,
    publishDate,
    updatedDate,
    heroImage,
    image,
    heroAlt,
    imageAlt,
    excerpt,
    platform: data.platform || "",
    patch: data.patch || "",
    readingTime: data.readingTime || "5 min read",
    tags,
    featured: Boolean(data.featured),
    related: data.related || [],
    faq: data.faq || [],
    seoTitle: data.seoTitle || data.title,
    metaDescription: data.metaDescription || excerpt,
    content,
    headings: extractHeadings(content),
    gameName: game?.name || data.game,
    categoryName: category?.name || data.category,
    tagNames: tags,
    authorData: getAuthorBySlug(authorSlug),
    reviewerData: getAuthorBySlug(reviewerSlug),
    description: excerpt,
    date: publishDate,
    updated: updatedDate,
    coverImage,
    coverAlt: imageAlt
  };
}

export function getAllAuthors() {
  return readJsonFiles<Omit<Author, "slug">>(authorDir).sort((a, b) => a.name.localeCompare(b.name));
}

export function getAuthorBySlug(slug: string) {
  return getAllAuthors().find((author) => author.slug === slug);
}

export function getAllCategories(): ContentTaxonomy[] {
  const fileCategories = readJsonFiles<Omit<ContentTaxonomy, "slug">>(categoryDir);
  const fallbackCategories = guideCategories.map((category) => ({
    slug: slugify(category),
    name: category.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: `${category} articles and resources.`
  }));
  const categories = new Map<string, ContentTaxonomy>();

  [...fallbackCategories, ...fileCategories].forEach((category) => {
    categories.set(category.slug, category);
  });

  return Array.from(categories.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getAllTags(): ContentTaxonomy[] {
  const fileTags = readJsonFiles<Omit<ContentTaxonomy, "slug">>(tagDir);
  const tagMap = new Map<string, ContentTaxonomy>();

  fileTags.forEach((tag) => tagMap.set(tag.slug, tag));
  getAllGuides().forEach((guide) => {
    guide.tags.forEach((tag) => {
      const slug = slugify(tag);
      if (!tagMap.has(slug)) {
        tagMap.set(slug, {
          slug,
          name: tag,
          description: `Guides tagged with ${tag}.`
        });
      }
    });
  });

  return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getAllGuides(): Guide[] {
  return getGuideFiles()
    .map(normalizeGuide)
    .sort((a, b) => Number(new Date(b.updatedDate)) - Number(new Date(a.updatedDate)));
}

export function getGuideBySlug(slug: string) {
  return getAllGuides().find((guide) => guide.slug === slug);
}

export const getGuide = getGuideBySlug;

export function getAllGames(): Game[] {
  const gameFiles = readJsonFiles<Omit<Game, "guideCount" | "coverImage" | "coverAlt" | "latestUpdated" | "categories" | "guides">>(
    gameDir
  );
  const guides = getAllGuides();
  const games = new Map<string, Game>();

  gameFiles.forEach((game) => {
    const gameGuides = guides.filter((guide) => guide.game === game.slug);
    games.set(game.slug, {
      ...game,
      guideCount: gameGuides.length,
      coverImage: gameGuides[0]?.heroImage || "",
      coverAlt: gameGuides[0]?.heroAlt || `${game.name} guide cover`,
      latestUpdated: gameGuides[0]?.updatedDate || "",
      categories: Array.from(new Set(gameGuides.map((guide) => guide.categoryName)))
    });
  });

  guides.forEach((guide) => {
    if (games.has(guide.game)) return;
    const gameGuides = guides.filter((item) => item.game === guide.game);
    games.set(guide.game, {
      slug: guide.game,
      name: guide.gameName,
      description: `${gameGuides.length} guides, walkthroughs, builds, maps, and player resources.`,
      platforms: guide.platform ? guide.platform.split(",").map((item) => item.trim()) : [],
      genre: "Game guide hub",
      guideCount: gameGuides.length,
      coverImage: gameGuides[0]?.heroImage || "",
      coverAlt: gameGuides[0]?.heroAlt || `${guide.gameName} guide cover`,
      latestUpdated: gameGuides[0]?.updatedDate || "",
      categories: Array.from(new Set(gameGuides.map((item) => item.categoryName)))
    });
  });

  return Array.from(games.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getGameBySlug(slug: string) {
  const game = getAllGames().find((item) => item.slug === slug);
  if (!game) return undefined;
  return {
    ...game,
    guides: getGuidesByGame(slug)
  };
}

export const getGame = getGameBySlug;

export function getGuidesByGame(slug: string) {
  return getAllGuides().filter((guide) => guide.game === slug);
}

export function getGuidesByCategory(slug: string) {
  return getAllGuides().filter((guide) => guide.category === slug);
}

export function getGuidesByTag(slug: string) {
  return getAllGuides().filter((guide) => guide.tags.some((tag) => slugify(tag) === slug));
}

const intentTokenGroups = {
  boss: ["boss", "bosses", "order"],
  map: ["map", "maps", "depths", "route", "routes", "location", "locations"],
  quest: ["quest", "quests", "walkthrough", "story"],
  class: ["strength", "dex", "dexterity", "faith", "intelligence", "mage", "bleed", "blood", "beginner"],
  weapon: ["weapon", "weapons", "sword", "katana", "staff", "seal", "bow", "shield"]
};

function guideTokenSet(guide: Guide) {
  return new Set(
    [guide.title, guide.excerpt, guide.category, guide.categoryName, guide.gameName, ...guide.tags]
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2)
  );
}

function relatedScore(source: Guide, candidate: Guide) {
  const sourceTokens = guideTokenSet(source);
  const candidateTokens = guideTokenSet(candidate);
  let score = 0;

  if (candidate.game === source.game) score += 100;
  if (candidate.category === source.category) score += 30;

  for (const token of Array.from(sourceTokens)) {
    if (candidateTokens.has(token)) score += 3;
  }

  Object.values(intentTokenGroups).forEach((tokens) => {
    const sourceMatches = tokens.some((token) => sourceTokens.has(token));
    const candidateMatches = tokens.some((token) => candidateTokens.has(token));
    if (sourceMatches && candidateMatches) score += 18;
  });

  return score;
}

export function getRelatedGuides(guide: Guide, limit = 4) {
  const explicit = guide.related.map(getGuideBySlug).filter((item): item is Guide => Boolean(item));
  const fallback = getAllGuides()
    .filter((item) => item.slug !== guide.slug && !explicit.some((related) => related.slug === item.slug))
    .sort(
      (left, right) =>
        relatedScore(guide, right) - relatedScore(guide, left) ||
        Number(new Date(right.updatedDate)) - Number(new Date(left.updatedDate)) ||
        left.title.localeCompare(right.title)
    );

  return [...explicit, ...fallback].slice(0, limit);
}

export function getAdjacentGuides(guide: Guide) {
  const guides = getAllGuides();
  const index = guides.findIndex((item) => item.slug === guide.slug);
  if (!guides.length || index < 0) {
    return {
      previous: undefined,
      next: undefined
    };
  }

  if (guides.length === 1) {
    return {
      previous: undefined,
      next: undefined
    };
  }

  return {
    previous: guides[(index - 1 + guides.length) % guides.length],
    next: guides[(index + 1) % guides.length]
  };
}

export function getAllCategorySlugs() {
  return getAllCategories().map((category) => category.slug);
}

export function getAllTagSlugs() {
  return getAllTags().map((tag) => tag.slug);
}
