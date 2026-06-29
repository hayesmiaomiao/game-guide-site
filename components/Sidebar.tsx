import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { Card } from "@/components/ui/Card";

export type SidebarGuide = {
  title: string;
  description?: string;
  href: string;
};

export function Sidebar({
  featuredGuide,
  trendingGuides = [],
  adLabel = "Sidebar Ad"
}: {
  featuredGuide?: SidebarGuide;
  trendingGuides?: SidebarGuide[];
  adLabel?: string;
}) {
  return (
    <aside className="space-y-5">
      <AdSlot label={adLabel} />
      {featuredGuide ? (
        <Card className="p-5">
          <p className="text-sm font-bold text-ember">Featured Guide</p>
          <h2 className="mt-3 text-xl font-black leading-tight text-white">
            <Link href={featuredGuide.href} className="hover:text-mana">
              {featuredGuide.title}
            </Link>
          </h2>
          {featuredGuide.description ? (
            <p className="mt-3 text-sm leading-6 text-slate-400">{featuredGuide.description}</p>
          ) : null}
          <Link href={featuredGuide.href} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-mana hover:text-white">
            Read featured guide
            <ArrowRight size={14} aria-hidden />
          </Link>
        </Card>
      ) : null}
      {trendingGuides.length ? (
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <BookOpen className="text-ember" size={20} aria-hidden />
            <h2 className="text-xl font-black text-white">Trending Guides</h2>
          </div>
          <ol className="mt-4 space-y-3">
            {trendingGuides.map((guide, index) => (
              <li key={guide.href} className="flex gap-3">
                <span className="text-sm font-black text-mana">{String(index + 1).padStart(2, "0")}</span>
                <Link href={guide.href} className="text-sm font-medium leading-6 text-slate-300 hover:text-white">
                  {guide.title}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </aside>
  );
}
