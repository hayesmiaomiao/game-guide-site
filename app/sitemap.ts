import type { MetadataRoute } from "next";
import { getAllCategorySlugs, getAllGames, getAllGuides, getAllTagSlugs } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/games", "/guides", "/about", "/contact"].map((path) => ({
    url: absoluteUrl(path || "/"),
    lastModified: new Date()
  }));

  const gameRoutes = getAllGames().map((game) => ({
    url: absoluteUrl(`/games/${game.slug}`),
    lastModified: new Date(game.latestUpdated)
  }));

  const guideRoutes = getAllGuides().map((guide) => ({
    url: absoluteUrl(`/guides/${guide.slug}`),
    lastModified: new Date(guide.updated)
  }));

  const categoryRoutes = getAllCategorySlugs().map((slug) => ({
    url: absoluteUrl(`/categories/${slug}`),
    lastModified: new Date()
  }));

  const tagRoutes = getAllTagSlugs().map((slug) => ({
    url: absoluteUrl(`/tags/${slug}`),
    lastModified: new Date()
  }));

  return [...staticRoutes, ...gameRoutes, ...guideRoutes, ...categoryRoutes, ...tagRoutes];
}
