import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { guideCategories, slugify } from "@/lib/site";

const guideDir = path.join(process.cwd(), "content", "guides");

export type GuideFrontmatter = {
  title: string;
  description: string;
  game: string;
  category: string;
  tags: string[];
  date: string;
  updated: string;
  coverImage: string;
  coverAlt?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | string;
  readingTime: string;
  faq?: { question: string; answer: string }[];
};

export type Guide = GuideFrontmatter & {
  slug: string;
  content: string;
};

function ensureGuideDir() {
  if (!fs.existsSync(guideDir)) {
    return [];
  }

  return fs.readdirSync(guideDir).filter((file) => file.endsWith(".mdx"));
}

export function getAllGuides(): Guide[] {
  return ensureGuideDir()
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const source = fs.readFileSync(path.join(guideDir, file), "utf8");
      const { data, content } = matter(source);

      return {
        slug,
        content,
        title: data.title,
        description: data.description,
        game: data.game,
        category: data.category,
        tags: data.tags || [],
        date: data.date,
        updated: data.updated || data.date,
        coverImage: data.coverImage,
        coverAlt: data.coverAlt,
        difficulty: data.difficulty,
        readingTime: data.readingTime,
        faq: data.faq || []
      } satisfies Guide;
    })
    .sort((a, b) => Number(new Date(b.updated)) - Number(new Date(a.updated)));
}

export function getGuide(slug: string) {
  return getAllGuides().find((guide) => guide.slug === slug);
}

export function getAllGames() {
  const games = new Map<string, Guide[]>();

  getAllGuides().forEach((guide) => {
    const key = slugify(guide.game);
    games.set(key, [...(games.get(key) || []), guide]);
  });

  return Array.from(games.entries())
    .map(([slug, guides]) => ({
      slug,
      name: guides[0].game,
      description: `${guides.length} guides, walkthroughs, builds, maps, and player resources.`,
      guideCount: guides.length,
      coverImage: guides[0].coverImage,
      coverAlt: guides[0].coverAlt || `${guides[0].game} guide cover`,
      latestUpdated: guides[0].updated,
      categories: Array.from(new Set(guides.map((guide) => guide.category)))
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getGame(slug: string) {
  const guides = getAllGuides().filter((guide) => slugify(guide.game) === slug);
  if (!guides.length) return undefined;

  return {
    slug,
    name: guides[0].game,
    guides,
    coverImage: guides[0].coverImage,
    coverAlt: guides[0].coverAlt || `${guides[0].game} guide cover`
  };
}

export function getGuidesByCategory(slug: string) {
  return getAllGuides().filter((guide) => slugify(guide.category) === slug);
}

export function getGuidesByTag(slug: string) {
  return getAllGuides().filter((guide) => guide.tags.some((tag) => slugify(tag) === slug));
}

export function getAllCategorySlugs() {
  return Array.from(new Set([...guideCategories, ...getAllGuides().map((guide) => guide.category)])).map(slugify);
}

export function getAllTagSlugs() {
  return Array.from(new Set(getAllGuides().flatMap((guide) => guide.tags.map(slugify))));
}
