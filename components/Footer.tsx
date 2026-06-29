import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-black/20">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-slate-400 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="font-semibold text-white">{siteConfig.name}</p>
          <p className="mt-2 max-w-2xl">{siteConfig.description}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-white">
            About
          </Link>
          <Link href="/contact" className="hover:text-white">
            Contact
          </Link>
          <Link href="/sitemap.xml" className="hover:text-white">
            Sitemap
          </Link>
        </div>
      </div>
    </footer>
  );
}
