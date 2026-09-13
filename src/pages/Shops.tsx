import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ShopCard } from "@/components/ShopCard";
import { SwissHeader } from "@/components/SwissHeader";

export default function Shops() {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      {/* Featured stores */}
      <section className="border-b-2 border-foreground bg-primary text-primary-foreground">
        <div className="container-swiss py-10 md:py-14">
          <div className="mb-8 flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-bold uppercase tracking-tight md:text-4xl">
              Featured stores
            </h1>
            <span className="grid-label hidden opacity-80 md:block">
              Hand-picked by your school admin
            </span>
          </div>

          {featured === undefined ? (
            <div className="grid gap-px border border-primary-foreground/40 bg-primary-foreground/40 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse bg-primary-foreground/20"
                />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="border-2 border-primary-foreground/60 p-10 text-center">
              <p className="text-lg font-bold uppercase">No featured stores yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm opacity-80">
                The school admin hand-picks shops to feature here. Open a shop to
                be considered.
              </p>
            </div>
          ) : (
            <div className="grid gap-px border-2 border-primary-foreground bg-primary-foreground sm:grid-cols-2 lg:grid-cols-3">
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
      <section className="border-b-2 border-foreground bg-muted">
        <div className="container-swiss py-12 md:py-16">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold uppercase tracking-tight md:text-3xl">
              Find a shop
            </h2>
            <span className="grid-label">
              {results
                ? `${results.length} shop${results.length === 1 ? "" : "s"}`
                : ""}
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

      {/* CTA */}
      <section>
        <div className="container-swiss py-12 md:py-16">
          <div className="flex flex-col items-start justify-between gap-6 border-4 border-foreground p-8 md:flex-row md:items-center md:p-12">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight md:text-4xl">
                Ready to open your shop?
              </h2>
              <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">
                Free forever for students and clubs. Takes about two minutes —
                then make it yours with the theme editor.
              </p>
            </div>
            <Link
              to="/create-shop"
              className="border-2 border-foreground bg-primary px-8 py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              Open a shop
            </Link>
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
