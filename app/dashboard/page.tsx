import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import matter from "gray-matter";
import { readAffiliateReport } from "@/lib/affiliate";
import { readPagePerformance } from "@/lib/analytics";
import { readKeywordIdeas } from "@/lib/keywords";
import { readGrowthPlan } from "@/lib/growth";
import { readSearchConsoleData } from "@/lib/search-console";
import { readTrendReport } from "@/lib/trends";
import { resolveGuideImage } from "@/lib/content";
import { DashboardClient, type DashboardGuide } from "./DashboardClient";

export const metadata: Metadata = {
  title: "Content Dashboard",
  description: "Guide inventory, patch status, and content health for GameVault Guides.",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-static";

const guidesDirectory = path.join(process.cwd(), "content", "guides");

function slugToName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function readDashboardGuides(): DashboardGuide[] {
  if (!fs.existsSync(guidesDirectory)) return [];

  return fs
    .readdirSync(guidesDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const source = fs.readFileSync(path.join(guidesDirectory, file), "utf8");
      const { data, content } = matter(source);
      const slug = String(data.slug || file.replace(/\.mdx$/, ""));
      const game = String(data.game || "unknown-game");
      const category = String(data.category || "uncategorized");
      const related = Array.isArray(data.related) ? data.related : [];
      const faq = Array.isArray(data.faq) ? data.faq : [];

      return {
        title: String(data.title || slugToName(slug)),
        game,
        gameName: slugToName(game),
        category,
        categoryName: slugToName(category),
        difficulty: String(data.difficulty || "Unknown"),
        patch: String(data.patch || "Not set"),
        updated: String(
          data.updatedDate || data.updated || data.publishDate || data.date || "Not set"
        ),
        needsUpdate: data.needsUpdate === true || data.needsUpdate === "true",
        seoScore: Number(data.seoScore || 0),
        reviewStatus: String(data.reviewStatus || "Not Reviewed"),
        needsRewrite:
          data.needsRewrite === true || data.needsRewrite === "true",
        topProblems: Array.isArray(data.topProblems)
          ? data.topProblems.map(String).slice(0, 3)
          : [],
        slug,
        faqCount: faq.length,
        tocExists: /^##\s+Table of Contents\s*$/im.test(content),
        relatedExists:
          related.length > 0 || /^##\s+Related Guides\s*$/im.test(content),
        image: resolveGuideImage(data),
        imageAlt: String(
          data.heroAlt ||
            data.imageAlt ||
            data.coverAlt ||
            `${data.title || slug} cover`
        )
      };
    })
    .sort((left, right) => {
      const dateDifference =
        Number(new Date(right.updated)) - Number(new Date(left.updated));
      return dateDifference || left.title.localeCompare(right.title);
    });
}

export default function DashboardPage() {
  return (
    <DashboardClient
      guides={readDashboardGuides()}
      keywords={readKeywordIdeas()}
      analyticsPerformance={readPagePerformance()}
      affiliateReport={readAffiliateReport()}
      growthPlan={readGrowthPlan()}
      searchConsole={readSearchConsoleData()}
      trendReport={readTrendReport()}
    />
  );
}
