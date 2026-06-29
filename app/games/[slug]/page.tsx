import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GuideCard } from "@/components/GuideCard";
import { getAllGames, getGame } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return getAllGames().map((game) => ({ slug: game.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const game = getGame(params.slug);
  if (!game) return {};

  return {
    title: `${game.name} Guides`,
    description: `Read ${game.name} walkthroughs, tier lists, builds, map guides, quest guides, and beginner tips.`,
    alternates: { canonical: absoluteUrl(`/games/${game.slug}`) },
    openGraph: {
      title: `${game.name} Guides`,
      description: `All ${game.name} guides in one place.`,
      images: [{ url: game.coverImage, alt: game.coverAlt }]
    }
  };
}

export default function GamePage({ params }: { params: { slug: string } }) {
  const game = getGame(params.slug);
  if (!game) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Games", href: "/games" },
          { label: game.name, href: `/games/${game.slug}` }
        ]}
      />
      <section className="grid gap-6 md:grid-cols-[1fr_340px]">
        <div>
          <div className="relative mb-6 aspect-[21/9] overflow-hidden rounded-lg border border-line">
            <Image src={game.coverImage} alt={game.coverAlt} fill priority className="object-cover" />
          </div>
          <h1 className="text-4xl font-black text-white">{game.name} Guides</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Walkthroughs, tier lists, builds, map guides, quest routes, and beginner-friendly strategy for {game.name}.
          </p>
        </div>
        <AdSlot label="Game page ad" />
      </section>
      <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {game.guides.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </section>
    </div>
  );
}
