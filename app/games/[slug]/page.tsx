import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Clock, Layers, Monitor } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { Breadcrumb } from "@/components/Breadcrumb";
import { GuideCard } from "@/components/GuideCard";
import { JsonLd } from "@/components/JsonLd";
import { Sidebar } from "@/components/Sidebar";
import { BreadcrumbJsonLd } from "@/components/json-ld/BreadcrumbJsonLd";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { getAllGames, getGame } from "@/lib/content";
import { absoluteUrl, siteConfig, slugify } from "@/lib/site";

export const dynamicParams = false;

const guideTabs = [
  { label: "Beginner Guides", category: "beginner guide", href: "beginner-guides" },
  { label: "Builds", category: "build guide", href: "builds" },
  { label: "Boss Guides", category: "boss guide", href: "boss-guides" },
  { label: "Maps", category: "map guide", href: "maps" },
  { label: "Walkthroughs", category: "walkthrough", href: "walkthroughs" },
  { label: "Quest Guides", category: "quest guide", href: "quest-guides" },
  { label: "Tier Lists", category: "tier list", href: "tier-lists" }
];

const gameDetails: Record<string, { intro: string; platforms: string[]; genre: string }> = {
  "elden-ring": {
    intro:
      "Elden Ring guides for early routing, boss preparation, weapon upgrades, build planning, and open-world progression.",
    platforms: ["PC", "PlayStation", "Xbox"],
    genre: "Open-world action RPG"
  },
  "honkai-star-rail": {
    intro:
      "Honkai Star Rail guides for character value, team building, relic priorities, account progression, and patch-aware tier list planning.",
    platforms: ["PC", "iOS", "Android", "PlayStation"],
    genre: "Turn-based RPG"
  },
  "the-legend-of-zelda-tears-of-the-kingdom": {
    intro:
      "Zelda Tears of the Kingdom guides for map routes, Depths exploration, quest planning, resource farming, and practical progression.",
    platforms: ["Nintendo Switch"],
    genre: "Open-world adventure"
  }
};

function getGameDetails(slug: string, name: string) {
  return (
    gameDetails[slug] || {
      intro: `${name} guides for beginner help, builds, maps, quests, walkthroughs, boss tips, and updated player strategies.`,
      platforms: ["PC", "Console", "Mobile"],
      genre: "Game guide hub"
    }
  );
}

function collectionPageSchema(game: NonNullable<ReturnType<typeof getGame>>) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${game.name} Guides`,
    description: `Browse practical ${game.name} guides, builds, maps, walkthroughs, boss tips, and beginner help updated for players.`,
    url: absoluteUrl(`/games/${game.slug}`),
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: game.guides.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/guides/${guide.slug}`),
        name: guide.title
      }))
    }
  };
}

export async function generateStaticParams() {
  const games = getAllGames();
  return games.map((game) => ({ slug: game.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const game = getGame(params.slug);
  if (!game) return {};

  const title = `${game.name} Guides, Builds, Maps & Walkthroughs | ${siteConfig.name}`;
  const description = `Browse practical ${game.name} guides, builds, maps, walkthroughs, boss tips, and beginner help updated for players.`;

  return {
    title: {
      absolute: title
    },
    description,
    alternates: { canonical: absoluteUrl(`/games/${game.slug}`) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/games/${game.slug}`),
      images: [{ url: game.coverImage, alt: game.coverAlt }]
    }
  };
}

export default function GamePage({ params }: { params: { slug: string } }) {
  const game = getGame(params.slug);
  if (!game) notFound();

  const details = getGameDetails(game.slug, game.name);
  const latestGuides = game.guides.slice(0, 6);
  const featuredGuide = game.guides[0];
  const groupedGuides = guideTabs.map((tab) => ({
    ...tab,
    guides: game.guides.filter((guide) => slugify(guide.category) === slugify(tab.category))
  }));
  const topicCards = guideTabs.slice(0, Math.max(0, 6 - latestGuides.length));
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Games", href: "/games" },
    { label: game.name, href: `/games/${game.slug}` }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <JsonLd data={collectionPageSchema(game)} />
      <Breadcrumb items={breadcrumbItems} />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden shadow-glow">
          <div className="relative aspect-[21/9] min-h-52">
            <Image src={game.coverImage} alt={game.coverAlt} fill priority className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/45 to-transparent" />
          </div>
          <div className="p-5 sm:p-7">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-mana">Game Guide Hub</p>
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">{game.name} Guides</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{details.intro}</p>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-line bg-white/[0.03] p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <Monitor size={14} aria-hidden />
                  Platform
                </dt>
                <dd className="mt-2 text-sm font-bold text-white">{details.platforms.join(", ")}</dd>
              </div>
              <div className="rounded-lg border border-line bg-white/[0.03] p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <Layers size={14} aria-hidden />
                  Genre
                </dt>
                <dd className="mt-2 text-sm font-bold text-white">{details.genre}</dd>
              </div>
              <div className="rounded-lg border border-line bg-white/[0.03] p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <BookOpen size={14} aria-hidden />
                  Guides
                </dt>
                <dd className="mt-2 text-sm font-bold text-white">{game.guides.length} published</dd>
              </div>
              <div className="rounded-lg border border-line bg-white/[0.03] p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <Clock size={14} aria-hidden />
                  Updated
                </dt>
                <dd className="mt-2 text-sm font-bold text-white">{featuredGuide.updated}</dd>
              </div>
            </dl>
            <Button href="#latest-guides" size="lg" className="mt-6">
              View Latest Guides
              <ArrowRight size={16} aria-hidden />
            </Button>
          </div>
        </Card>
        <Sidebar
          adLabel="Game Page Top Ad"
          featuredGuide={{
            title: featuredGuide.title,
            description: featuredGuide.description,
            href: `/guides/${featuredGuide.slug}`
          }}
        />
      </section>

      <Section className="px-0" title="Guide Category Tabs">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {guideTabs.map((tab) => (
            <Button key={tab.href} href={`#${tab.href}`} variant="secondary" size="md" className="shrink-0">
              {tab.label}
            </Button>
          ))}
        </div>
      </Section>

      <Section
        className="px-0"
        contentClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        eyebrow="Fresh"
        title="Latest Guides"
        action={
          <Button href="/guides" variant="ghost" size="sm">
            All guides
          </Button>
        }
      >
        {latestGuides.map((guide) => (
          <GuideCard
            key={guide.slug}
            title={guide.title}
            description={guide.description}
            game={guide.game}
            category={guide.category}
            updated={guide.updated}
            readingTime={guide.readingTime}
            href={`/guides/${guide.slug}`}
            tags={guide.tags}
          />
        ))}
        {topicCards.map((tab) => (
          <Card key={tab.href} className="border-dashed bg-white/[0.025] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ember">Guide Topic</p>
            <h3 className="mt-3 text-lg font-bold leading-snug text-white">
              {game.name} {tab.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Browse available {game.name} coverage and upcoming articles for this guide type.
            </p>
            <Link href={`#${tab.href}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-mana hover:text-white">
              View topic
              <ArrowRight size={14} aria-hidden />
            </Link>
          </Card>
        ))}
      </Section>

      <AdSlot label="In Content Ad" className="mt-10" />

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        {groupedGuides.map((group) => (
          <Card key={group.href} id={group.href} className="p-5">
            <h2 className="text-xl font-black text-white">{group.label}</h2>
            {group.guides.length ? (
              <ul className="mt-4 space-y-3">
                {group.guides.map((guide) => (
                  <li key={guide.slug}>
                    <Link href={`/guides/${guide.slug}`} className="font-bold text-slate-200 hover:text-mana">
                      {guide.title}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">
                      Updated {guide.updated} · {guide.readingTime}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-400">
                New {game.name} {group.label.toLowerCase()} are being prepared for this hub.
              </p>
            )}
          </Card>
        ))}
      </section>

      <Card className="mt-10 p-5 sm:p-7">
        <h2 className="text-2xl font-black text-white sm:text-3xl">FAQ</h2>
        <div className="mt-5 divide-y divide-line">
          {[
            {
              question: `Is ${game.name} beginner friendly?`,
              answer: `${game.name} can be beginner friendly when you follow a focused route, avoid wasting upgrades, and start with guides built around early progression.`
            },
            {
              question: "What guide should I read first?",
              answer: `Start with ${featuredGuide.title}, then use the category tabs to move into builds, maps, quests, or tier lists.`
            },
            {
              question: "How often are guides updated?",
              answer: "Guides are updated when new strategies, patches, routes, or content changes affect the advice players need."
            },
            {
              question: "Are tier lists updated after patches?",
              answer: "Tier lists should be reviewed after major balance patches, new characters, new weapons, or meta-changing discoveries."
            }
          ].map((item) => (
            <details key={item.question} className="py-4">
              <summary className="cursor-pointer font-bold text-white">{item.question}</summary>
              <p className="mt-2 leading-7 text-slate-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </Card>

      <AdSlot label="Bottom Ad" className="mt-10" />
    </div>
  );
}
