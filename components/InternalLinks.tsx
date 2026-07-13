import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

export type InternalLinkItem = {
  title: string;
  href: string;
  description?: string;
};

export type InternalLinkSection = {
  title: string;
  description?: string;
  links: InternalLinkItem[];
};

export function InternalLinks({ sections }: { sections: InternalLinkSection[] }) {
  const visibleSections = sections.filter((section) => section.links.length > 0);
  if (!visibleSections.length) return null;

  return (
    <section className="mt-10">
      <div className="mb-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-mana">Keep Reading</p>
        <h2 className="text-2xl font-black text-white">Recommended Guide Paths</h2>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {visibleSections.map((section) => (
          <Card key={section.title} className="p-5">
            <h3 className="text-lg font-black text-white">{section.title}</h3>
            {section.description ? (
              <p className="mt-2 text-sm leading-6 text-slate-400">{section.description}</p>
            ) : null}
            <ul className="mt-4 space-y-3">
              {section.links.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="group block">
                    <span className="flex items-start justify-between gap-3 text-sm font-bold leading-6 text-slate-200 group-hover:text-mana">
                      {item.title}
                      <ArrowRight size={14} className="mt-1 shrink-0" aria-hidden />
                    </span>
                    {item.description ? (
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
                        {item.description}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}
