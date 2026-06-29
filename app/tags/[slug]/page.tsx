import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GuideCard } from "@/components/GuideCard";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllTagSlugs, getGuidesByTag } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllTagSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const title = params.slug.replace(/-/g, " ");
  return {
    title: `${title} Guides`,
    description: `Guides tagged with ${title}, including builds, routes, tier lists, and walkthroughs.`,
    alternates: { canonical: absoluteUrl(`/tags/${params.slug}`) }
  };
}

export default function TagPage({ params }: { params: { slug: string } }) {
  const guides = getGuidesByTag(params.slug);
  if (!guides.length) notFound();
  const title = params.slug.replace(/-/g, " ");

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Tag" title={title} />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </section>
  );
}
