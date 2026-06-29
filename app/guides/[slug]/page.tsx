import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";
import { AdSlot } from "@/components/AdSlot";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getAllGuides, getGuide } from "@/lib/content";
import { articleSchema, faqSchema, guideBreadcrumbs } from "@/lib/schema";
import { absoluteUrl, slugify } from "@/lib/site";

export function generateStaticParams() {
  return getAllGuides().map((guide) => ({ slug: guide.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const guide = getGuide(params.slug);
  if (!guide) return {};

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: absoluteUrl(`/guides/${guide.slug}`) },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description,
      publishedTime: guide.date,
      modifiedTime: guide.updated,
      images: [{ url: guide.coverImage, alt: guide.coverAlt || guide.title }]
    }
  };
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const { content } = await compileMDX({
    source: guide.content,
    components: {
      AdSlot
    },
    options: {
      parseFrontmatter: false
    }
  });

  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd data={articleSchema(guide)} />
      <JsonLd data={guideBreadcrumbs(guide)} />
      <JsonLd data={faqSchema(guide)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Guides", href: "/guides" },
          { label: guide.game, href: `/games/${slugify(guide.game)}` },
          { label: guide.title, href: `/guides/${guide.slug}` }
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-5 flex flex-wrap gap-2 text-sm">
            <Link href={`/games/${slugify(guide.game)}`} className="rounded bg-white/5 px-3 py-1 text-slate-300">
              {guide.game}
            </Link>
            <Link href={`/categories/${slugify(guide.category)}`} className="rounded bg-mana/10 px-3 py-1 text-mana">
              {guide.category}
            </Link>
          </div>
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">{guide.title}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">{guide.description}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-500">
            <span>Published {guide.date}</span>
            <span>Updated {guide.updated}</span>
            <span>{guide.difficulty}</span>
            <span>{guide.readingTime}</span>
          </div>
          <div className="relative my-8 aspect-[16/9] overflow-hidden rounded-lg border border-line">
            <Image
              src={guide.coverImage}
              alt={guide.coverAlt || `${guide.title} cover image`}
              fill
              priority
              className="object-cover"
            />
          </div>
          <div className="article-body prose prose-invert max-w-none prose-headings:text-white prose-img:rounded-lg prose-strong:text-white">
            {content}
          </div>
          {guide.faq?.length ? (
            <section className="mt-10 rounded-lg border border-line bg-panel p-6">
              <h2 className="text-2xl font-black text-white">FAQ</h2>
              <div className="mt-4 divide-y divide-line">
                {guide.faq.map((item) => (
                  <details key={item.question} className="py-4">
                    <summary className="cursor-pointer font-bold text-white">{item.question}</summary>
                    <p className="mt-2 text-slate-300">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <aside className="space-y-5">
          <AdSlot label="Article top ad" />
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="font-bold text-white">Tags</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {guide.tags.map((tag) => (
                <Link key={tag} href={`/tags/${slugify(tag)}`} className="rounded bg-white/5 px-2 py-1 text-sm text-slate-300">
                  {tag}
                </Link>
              ))}
            </div>
          </div>
          <AdSlot label="Article sidebar ad" />
        </aside>
      </div>
    </article>
  );
}
