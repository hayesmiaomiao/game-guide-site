import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${siteConfig.name}, an English game guide site for walkthroughs, builds, tier lists, maps, and quests.`,
  alternates: { canonical: absoluteUrl("/about") }
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-mana">About</p>
      <h1 className="mt-3 text-4xl font-black text-white">{siteConfig.name}</h1>
      <div className="mt-6 space-y-5 leading-8 text-slate-300">
        <p>
          {siteConfig.name} publishes clear English game guides for players who want practical answers without digging
          through long threads or patch notes.
        </p>
        <p>
          The site is structured around beginner guides, walkthroughs, tier lists, build guides, map guides, and quest
          guides so readers and search engines can quickly understand each page.
        </p>
      </div>
    </section>
  );
}
