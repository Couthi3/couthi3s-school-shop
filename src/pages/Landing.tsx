import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Search, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShopCard } from "@/components/ShopCard";
import { SwissHeader } from "@/components/SwissHeader";

export default function Landing() {
  const featured = useQuery(api.shops.featuredShops);
  const allShops = useQuery(api.shops.allShops);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!allShops) return null;
    const q = query.trim().toLowerCase();
    if (!q) return allShops;
    return allShops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q),
    );
  }, [allShops, query]);

  const searching = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      {/* Compact hero — keeps Featured stores on the first screen */}
      <section className="border-b-2 border-foreground bg-primary text-primary-foreground">
        <div className="container-swiss flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between md:py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h1 className="text-3xl font-bold uppercase leading-none tracking-tight md:text-5xl">
              School Shops<span className="opacity-60">.</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-5 md:text-base md:leading-6">
              Free storefronts for your school — buyers pick the period they
              want their order delivered in.
            </p>
          </motion.div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 border-2 border-primary-foreground bg-transparent px-5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-foreground hover:text-primary"
            >
              <Link to="/create-shop">Open a shop — free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="h-11 bg-primary-foreground px-5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary-foreground/90"
            >
              <Link to="/shop-signin">Shop owner sign-in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured stores — first screen */}
      <section id="featured" className="border-b-2 border-foreground">
        <div className="container-swiss py-12 md:py-16">
          <div className="mb-8 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold uppercase tracking-tight md:text-3xl">
              Featured stores
            </h2>
            <span className="grid-label hidden md:block">Hand-picked daily</span>
          </div>

          {featured === undefined ? (
            <div className="grid gap-px border border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse bg-muted" />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="border border-foreground p-10 text-center">
              <p className="text-lg font-bold uppercase">
                No featured stores yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                The school admin hand-picks shops to feature here. Open a shop
                to be considered.
              </p>
            </div>
          ) : (
            <div className="grid gap-px border border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((shop) => (
                <ShopCard
                  key={shop._id}
                  name={shop.name}
                  description={shop.description}
                  href={`/shop/${shop._id}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Search */}
      <section id="search" className="border-b-2 border-foreground bg-muted">
        <div className="container-swiss py-12 md:py-16">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold uppercase tracking-tight md:text-3xl">
              Find a shop
            </h2>
            <span className="grid-label">
              {results ? `${results.length} shop${results.length === 1 ? "" : "s"}` : ""}
            </span>
          </div>
          <div className="relative mb-8 max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shops by name or what they sell…"
              className="h-11 border-foreground pl-9 text-base"
            />
          </div>

          {results === null ? (
            <div className="grid gap-px border border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse bg-background" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="border border-foreground bg-background p-10 text-center">
              <p className="text-lg font-bold uppercase">No shops found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Nothing matches “{query.trim()}”. Try another name.
              </p>
            </div>
          ) : (
            <div className="grid gap-px border border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-3">
              {results.map((shop) => (
                <ShopCard
                  key={shop._id}
                  name={shop.name}
                  description={shop.description}
                  href={`/shop/${shop._id}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-b-2 border-foreground">
        <div className="container-swiss py-12 md:py-16">
          <h2 className="mb-8 text-2xl font-bold uppercase tracking-tight md:text-3xl">
            How it works
          </h2>
          <div className="grid gap-px border border-foreground bg-foreground md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Open a shop",
                body: "Name your shop — no account needed. It's free, and you get a private code that signs you in from any device.",
              },
              {
                n: "02",
                title: "List items & save",
                body: "Add items with prices, flip them available or sold out, and hit save. Your storefront updates live for every buyer.",
              },
              {
                n: "03",
                title: "Deliver by period",
                body: "Buyers pick the period they want their order in. You see every order grouped by period and mark it ready or delivered.",
              },
            ].map((step) => (
              <div key={step.n} className="bg-background p-6 md:p-8">
                <div className="font-mono-swiss text-4xl font-bold text-primary">
                  {step.n}
                </div>
                <h3 className="mt-4 text-lg font-bold uppercase">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="container-swiss py-14 md:py-20">
          <div className="flex flex-col items-start justify-between gap-6 border-4 border-foreground p-8 md:flex-row md:items-center md:p-12">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight md:text-4xl">
                Ready to open your shop?
              </h2>
              <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">
                Free forever for students and clubs. Takes about two minutes.
              </p>
            </div>
            <Button asChild size="lg" className="h-12 px-8 text-sm font-bold uppercase tracking-wider">
              <Link to="/create-shop">
                <Store className="size-4" />
                Open a shop
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-foreground">
        <div className="container-swiss flex flex-col gap-2 py-8 md:flex-row md:items-center md:justify-between">
          <span className="grid-label">School Shops — built for students</span>
          <div className="flex gap-5 text-sm">
            <Link to="/shop-signin" className="hover:text-primary">
              Shop sign-in
            </Link>
            <Link to="/create-shop" className="hover:text-primary">
              Open a shop
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
