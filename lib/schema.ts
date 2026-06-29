import type { Guide } from "@/lib/content";
import { absoluteUrl, siteConfig, slugify } from "@/lib/site";

export function articleSchema(guide: Guide) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    image: [guide.coverImage],
    datePublished: guide.date,
    dateModified: guide.updated,
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name
    },
    mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
    articleSection: guide.category,
    keywords: guide.tags.join(", ")
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function faqSchema(guide: Guide) {
  if (!guide.faq?.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

export function guideBreadcrumbs(guide: Guide) {
  return breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: guide.game, path: `/games/${slugify(guide.game)}` },
    { name: guide.title, path: `/guides/${guide.slug}` }
  ]);
}
