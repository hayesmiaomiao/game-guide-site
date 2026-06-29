import type { Guide } from "@/lib/content";
import { absoluteUrl, siteConfig, slugify } from "@/lib/site";

export function articleSchema(guide: Guide) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.metaDescription || guide.description,
    image: [guide.heroImage],
    datePublished: guide.publishDate,
    dateModified: guide.updatedDate,
    author: {
      "@type": "Person",
      name: guide.authorData?.name || guide.author
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name
    },
    mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
    articleSection: guide.categoryName,
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
    { name: guide.gameName, path: `/games/${guide.game}` },
    { name: guide.title, path: `/guides/${guide.slug}` }
  ]);
}
