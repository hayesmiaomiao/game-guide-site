import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${siteConfig.name} for corrections, guide requests, partnerships, or advertising.`,
  alternates: { canonical: absoluteUrl("/contact") }
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-mana">Contact</p>
      <h1 className="mt-3 text-4xl font-black text-white">Contact Us</h1>
      <p className="mt-6 leading-8 text-slate-300">
        Send guide requests, correction notes, partnership questions, and advertising inquiries to{" "}
        <a href="mailto:hello@example.com" className="text-mana hover:underline">
          hello@example.com
        </a>
        .
      </p>
    </section>
  );
}
