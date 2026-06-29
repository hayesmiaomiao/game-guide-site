export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "GameVault Guides",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, ""),
  description:
    "English game guides, walkthroughs, tier lists, build guides, map guides, and quest help for players who want clear answers fast.",
  nav: [
    { href: "/games", label: "Games" },
    { href: "/guides", label: "Guides" },
    { href: "/categories/beginner-guide", label: "Beginner" },
    { href: "/categories/tier-list", label: "Tier Lists" },
    { href: "/about", label: "About" }
  ]
};

export const guideCategories = [
  "beginner guide",
  "walkthrough",
  "tier list",
  "build guide",
  "map guide",
  "quest guide"
];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function absoluteUrl(path = "/") {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
