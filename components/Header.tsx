import Link from "next/link";
import { Gamepad2, Search } from "lucide-react";
import { siteConfig } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-void/88 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-mana/15 text-mana">
            <Gamepad2 size={20} aria-hidden />
          </span>
          <span>{siteConfig.name}</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-slate-300 md:flex">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/guides#search"
          aria-label="Search guides"
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-slate-300 hover:border-mana hover:text-white"
        >
          <Search size={17} aria-hidden />
        </Link>
      </div>
    </header>
  );
}
