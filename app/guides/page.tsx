import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { GuideSearch } from "@/components/GuideSearch";
import { SectionHeading } from "@/components/SectionHeading";
import { getAllGuides } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Guides",
  description: "Search English game guides by game, category, tag, build, map, quest, walkthrough, or tier list.",
  alternates: { canonical: absoluteUrl("/guides") }
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Search" title="All Guides" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <GuideSearch guides={guides} />
        <div className="space-y-5">
          <AdSlot label="Guides sidebar ad" />
          <AdSlot label="Affiliate or display ad" />
        </div>
      </div>
    </div>
  );
}
