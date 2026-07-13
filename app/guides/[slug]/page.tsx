import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { HTMLAttributes } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { Breadcrumb } from "@/components/Breadcrumb";
import { InternalLinks } from "@/components/InternalLinks";
import { JsonLd } from "@/components/JsonLd";
import { BreadcrumbJsonLd } from "@/components/json-ld/BreadcrumbJsonLd";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  getAdjacentGuides,
  getAllGuides,
  getGuideBySlug,
  getRelatedGuides
} from "@/lib/content";
import { FALLBACK_GUIDE_IMAGE } from "@/lib/guide-images";
import { articleSchema, faqSchema } from "@/lib/schema";
import { absoluteImageUrl, absoluteUrl, seoAlternates, siteConfig } from "@/lib/site";
import { slugify } from "@/lib/site";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllGuides().map((guide) => ({ slug: guide.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const guide = getGuideBySlug(params.slug);
  if (!guide) return {};
  const image = guide.coverImage || guide.heroImage || guide.image || FALLBACK_GUIDE_IMAGE;
  const imageAlt = guide.imageAlt || guide.heroAlt;

  return {
    title: {
      absolute: guide.seoTitle
    },
    description: guide.metaDescription,
    alternates: seoAlternates(`/guides/${guide.slug}`),
    openGraph: {
      type: "article",
      title: guide.seoTitle,
      description: guide.metaDescription,
      url: absoluteUrl(`/guides/${guide.slug}`),
      siteName: siteConfig.name,
      publishedTime: guide.publishDate,
      modifiedTime: guide.updatedDate,
      images: [{ url: absoluteImageUrl(image), alt: imageAlt }]
    },
    twitter: {
      card: "summary_large_image",
      title: guide.seoTitle,
      description: guide.metaDescription,
      images: [absoluteImageUrl(image)]
    }
  };
}

function mdxHeading(level: 2 | 3) {
  const Heading = ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
    const text = typeof children === "string" ? children : "";
    const id = slugify(text);
    const Tag = `h${level}` as "h2" | "h3";
    return (
      <Tag id={id} {...props}>
        {children}
      </Tag>
    );
  };

  return Heading;
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const guide = getGuideBySlug(params.slug);
  if (!guide) notFound();
  const image = guide.coverImage || guide.heroImage || guide.image || FALLBACK_GUIDE_IMAGE;
  const imageAlt = guide.imageAlt || guide.heroAlt;

  const allGuides = getAllGuides();
  const relatedGuides = getRelatedGuides(guide, 4);
  const popularGuides = allGuides.filter((item) => item.slug !== guide.slug).slice(0, 6);
  const latestGuides = allGuides
    .filter((item) => item.slug !== guide.slug)
    .sort((left, right) => Number(new Date(right.updatedDate)) - Number(new Date(left.updatedDate)))
    .slice(0, 6);
  const { previous, next } = getAdjacentGuides(guide);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Guides", href: "/guides" },
    { label: guide.gameName, href: `/games/${guide.game}` },
    { label: guide.title, href: `/guides/${guide.slug}` }
  ];

  // insert an AdSlot after every 5 rendered paragraphs in the MDX
  let paraIndex = 0;
  const P = ({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) => {
    paraIndex++;
    return (
      <>
        <p {...props}>{children}</p>
        {paraIndex % 5 === 0 ? <AdSlot label="In-article Ad" className="mt-6" /> : null}
      </>
    );
  };

  const { content } = await compileMDX({
    source: guide.content,
    components: {
      AdSlot,
      p: P,
      h2: mdxHeading(2),
      h3: mdxHeading(3)
    },
    options: {
      parseFrontmatter: false
    }
  });

  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd data={articleSchema(guide)} />
      <JsonLd data={faqSchema(guide)} />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <Breadcrumb items={breadcrumbItems} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge href={`/games/${guide.game}`}>{guide.gameName}</Badge>
            <Badge href={`/categories/${guide.category}`} tone="mana">
              {guide.categoryName}
            </Badge>
            <Badge tone="ember">{guide.difficulty}</Badge>
          </div>

          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">{guide.title}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">{guide.excerpt}</p>

          <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-500">
            <span>Published {guide.publishDate}</span>
            <span>Updated {guide.updatedDate}</span>
            <span>{guide.platform}</span>
            <span>{guide.patch}</span>
            <span>{guide.readingTime}</span>
          </div>

          <div className="relative my-8 aspect-[16/9] overflow-hidden rounded-lg border border-line">
            <Image src={image} alt={imageAlt} fill priority className="object-cover" />
          </div>

          <Card className="mb-8 p-5 sm:p-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-mana">Guide Brief</p>
            <h2 className="text-2xl font-black text-white">Quick Answer and Route</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-white/[0.03] p-4">
                <h3 className="font-bold text-white">Introduction</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{guide.excerpt}</p>
              </div>
              <div className="rounded-lg border border-line bg-white/[0.03] p-4">
                <h3 className="font-bold text-white">Quick Answer</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  For {guide.gameName}, start with the safest route in this {guide.categoryName.toLowerCase()}, then adjust
                  around your level, patch version, available gear, and the problems listed below.
                </p>
              </div>
              <div className="rounded-lg border border-line bg-white/[0.03] p-4">
                <h3 className="font-bold text-white">Detailed Steps</h3>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-400">
                  <li>Check the requirements, patch notes, and starting assumptions.</li>
                  <li>Follow the main route in order before optional upgrades or detours.</li>
                  <li>Use the FAQ and related guides when a build, boss, map, or quest step branches.</li>
                </ol>
              </div>
              <div className="rounded-lg border border-line bg-white/[0.03] p-4">
                <h3 className="font-bold text-white">Common Mistakes</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-400">
                  <li>Skipping prerequisites before following later steps.</li>
                  <li>Using outdated patch advice without checking the updated date.</li>
                  <li>Ignoring tags and related guides that cover nearby systems.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="mb-8 p-5">
            <h2 className="text-xl font-black text-white">Table of Contents</h2>
            <ol className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              {guide.headings.map((heading) => (
                <li key={heading.id} className={heading.depth === 3 ? "pl-4" : undefined}>
                  <Link href={`#${heading.id}`} className="hover:text-mana">
                    {heading.text}
                  </Link>
                </li>
              ))}
            </ol>
          </Card>

          <div className="article-body prose prose-invert max-w-none prose-headings:text-white prose-img:rounded-lg prose-strong:text-white">
            {content}
          </div>

          {guide.faq.length ? (
            <Card className="mt-10 p-6">
              <h2 className="text-2xl font-black text-white">FAQ</h2>
              <div className="mt-4 divide-y divide-line">
                {guide.faq.map((item) => (
                  <details key={item.question} className="py-4">
                    <summary className="cursor-pointer font-bold text-white">{item.question}</summary>
                    <p className="mt-2 text-slate-300">{item.answer}</p>
                  </details>
                ))}
              </div>
            </Card>
          ) : null}

          <InternalLinks
            sections={[
              {
                title: "Related Guides",
                description: `More ${guide.gameName} pages connected to this topic.`,
                links: relatedGuides.map((item) => ({
                  title: item.title,
                  href: `/guides/${item.slug}`,
                  description: item.excerpt
                }))
              },
              {
                title: "Popular Guides",
                description: "High-value guide hubs readers often open next.",
                links: popularGuides.map((item) => ({
                  title: item.title,
                  href: `/guides/${item.slug}`,
                  description: item.excerpt
                }))
              },
              {
                title: "Latest Guides",
                description: "Recently updated pages to continue from here.",
                links: latestGuides.map((item) => ({
                  title: item.title,
                  href: `/guides/${item.slug}`,
                  description: item.excerpt
                }))
              }
            ]}
          />

          <nav className="mt-10 grid gap-4 md:grid-cols-2" aria-label="Previous and next guides">
            {previous ? (
              <Card className="p-5">
                <p className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                  <ArrowLeft size={14} aria-hidden />
                  Previous guide
                </p>
                <Link href={`/guides/${previous.slug}`} className="font-bold text-white hover:text-mana">
                  {previous.title}
                </Link>
              </Card>
            ) : null}
            {next ? (
              <Card className="p-5 md:text-right">
                <p className="mb-2 flex items-center gap-2 text-sm text-slate-500 md:justify-end">
                  Next guide
                  <ArrowRight size={14} aria-hidden />
                </p>
                <Link href={`/guides/${next.slug}`} className="font-bold text-white hover:text-mana">
                  {next.title}
                </Link>
              </Card>
            ) : null}
          </nav>
        </div>

        <aside className="hidden md:block md:sticky md:top-20 space-y-5">
          <AdSlot label="Article top ad" />
          {guide.authorData ? (
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <Image
                  src={guide.authorData.avatar}
                  alt={`${guide.authorData.name} avatar`}
                  width={56}
                  height={56}
                  className="rounded-lg"
                />
                <div>
                  <h2 className="font-bold text-white">{guide.authorData.name}</h2>
                  <p className="text-sm text-mana">{guide.authorData.role}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">{guide.authorData.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {guide.authorData.expertise.map((item) => (
                  <Badge key={item}>{item}</Badge>
                ))}
              </div>
            </Card>
          ) : null}

          {guide.reviewerData ? (
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <CheckCircle2 size={16} className="text-toxic" aria-hidden />
                Reviewed by {guide.reviewerData.name}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{guide.reviewerData.role}</p>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="font-bold text-white">Tags</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {guide.tags.map((tag) => (
                <Badge key={tag} href={`/tags/${slugify(tag)}`}>
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>
          <AdSlot label="Article sidebar ad" />
        </aside>
      </div>
    </article>
  );
}
