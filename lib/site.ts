export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "GameVault Guides",
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://game-guide-site-topaz.vercel.app"
  ).replace(/\/$/, ""),
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

export function absoluteImageUrl(src = "") {
  if (!src) return absoluteUrl("/");
  if (/^https?:\/\//i.test(src)) return src;
  return absoluteUrl(src);
}

export function seoAlternates(path = "/") {
  const url = absoluteUrl(path);
  return {
    canonical: url,
    languages: {
      "en-US": url,
      "x-default": url
    }
  };
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
