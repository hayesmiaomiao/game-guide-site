import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-ember">404</p>
        <h1 className="mt-3 text-4xl font-black text-white">Page not found</h1>
        <p className="mt-4 text-slate-300">
          The guide, game, category, or tag you are looking for is not available.
        </p>
        <Link href="/guides" className="mt-7 inline-block rounded-lg bg-mana px-5 py-3 text-sm font-bold text-slate-950">
          Browse Guides
        </Link>
      </div>
    </section>
  );
}
