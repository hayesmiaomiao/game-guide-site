import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GuideCard } from "@/components/GuideCard";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllCategorySlugs, getGuidesByCategory } from "@/lib/content";
import { absoluteUrl, guideCategories, slugify } from "@/lib/site";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const title = params.slug.replace(/-/g, " ");
  return {
    title: `${title} Guides`,
    description: `Browse ${title} articles, strategy, walkthroughs, and player tips.`,
    alternates: { canonical: absoluteUrl(`/categories/${params.slug}`) }
  };
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const guides = getGuidesByCategory(params.slug);
  const knownCategory = guideCategories.find((category) => slugify(category) === params.slug);
  if (!guides.length && !knownCategory) notFound();
  const title = guides[0]?.categoryName || knownCategory || params.slug.replace(/-/g, " ");

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Category" title={title} />
      {guides.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-panel p-8 text-slate-300">
          New {title} articles are being prepared.
        </div>
      )}
    </section>
  );
}
