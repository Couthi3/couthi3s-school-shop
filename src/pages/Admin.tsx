import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SwissHeader } from "@/components/SwissHeader";
import { api } from "../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  KeyRound,
  Loader2,
  Pin,
  PinOff,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Admin() {
  const adminState = useQuery(api.admin.adminState);
  const allShops = useQuery(
    api.admin.allShops,
    adminState?.isAdmin ? {} : "skip",
  );

  const claimAdmin = useMutation(api.admin.claimAdmin);
  const createInvite = useMutation(api.admin.createAdminInvite);
  const setFeatured = useMutation(api.admin.setFeatured);
  const moveFeatured = useMutation(api.admin.moveFeatured);

  const [code, setCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [busyShop, setBusyShop] = useState<string | null>(null);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaiming(true);
    try {
      await claimAdmin({ code });
      toast.success("Admin access granted");
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setClaiming(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      const c = await createInvite({});
      toast.success(`Invite code: ${c} — enter it on this page while signed in`);
      setCode(c);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const toggleFeatured = async (shopId: string, featured: boolean) => {
    setBusyShop(shopId);
    try {
      await setFeatured({ shopId: shopId as never, featured });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyShop(null);
    }
  };

  const move = async (shopId: string, direction: "up" | "down") => {
    setBusyShop(shopId);
    try {
      await moveFeatured({ shopId: shopId as never, direction });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyShop(null);
    }
  };

  if (adminState === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <SwissHeader />
        <div className="container-swiss py-20 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const featured = (allShops ?? [])
    .filter((s) => s.featured)
    .sort((a, b) => a.featuredOrder - b.featuredOrder);
  const rest = (allShops ?? [])
    .filter((s) => !s.featured)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      <div className="container-swiss py-10 md:py-14">
        <div className="grid-label mb-5 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          Site administration
        </div>
        <h1 className="text-4xl font-bold uppercase tracking-tight md:text-5xl">
          Featured stores
        </h1>
        <p className="mt-4 max-w-xl text-base leading-6 text-muted-foreground">
          Hand-pick the shops that appear on the home page. Pinned shops show
          first, in the order you set.
        </p>

        {adminState.isAdmin ? (
          allShops === undefined ? (
            <div className="mt-12 py-10 text-center">
              <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Featured list */}
              <section className="mt-12">
                <h2 className="mb-5 text-xl font-bold uppercase">
                  Pinned to home page
                  <span className="ml-2 font-mono-swiss text-sm text-primary">
                    {featured.length}
                  </span>
                </h2>
                {featured.length === 0 ? (
                  <div className="border-2 border-dashed border-foreground p-8 text-center text-sm text-muted-foreground">
                    Nothing pinned yet — use “Pin” below to feature a shop.
                  </div>
                ) : (
                  <div className="border-2 border-foreground">
                    {featured.map((shop, idx) => (
                      <div
                        key={shop._id}
                        className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 last:border-b-0"
                      >
                        <span className="font-mono-swiss w-8 text-lg font-bold text-primary">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-bold uppercase">
                            {shop.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {shop.description || "No description"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-xs uppercase"
                          >
                            <Link to={`/shop/${shop._id}`}>View</Link>
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="border-foreground"
                            disabled={idx === 0 || busyShop === shop._id}
                            title="Move up"
                            onClick={() => move(shop._id, "up")}
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="border-foreground"
                            disabled={
                              idx === featured.length - 1 || busyShop === shop._id
                            }
                            title="Move down"
                            onClick={() => move(shop._id, "down")}
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-foreground"
                            disabled={busyShop === shop._id}
                            onClick={() => toggleFeatured(shop._id, false)}
                          >
                            <PinOff className="size-3.5" />
                            Unpin
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* All other shops */}
              <section className="mt-12">
                <h2 className="mb-5 text-xl font-bold uppercase">
                  All shops
                  <span className="ml-2 font-mono-swiss text-sm text-muted-foreground">
                    {rest.length}
                  </span>
                </h2>
                {rest.length === 0 ? (
                  <div className="border-2 border-dashed border-foreground p-8 text-center text-sm text-muted-foreground">
                    No unpinned shops. New shops appear here as students create
                    them.
                  </div>
                ) : (
                  <div className="border-2 border-foreground">
                    {rest.map((shop) => (
                      <div
                        key={shop._id}
                        className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-bold uppercase">
                            {shop.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {shop.description || "No description"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-xs uppercase"
                          >
                            <Link to={`/shop/${shop._id}`}>View</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-foreground"
                            disabled={busyShop === shop._id}
                            onClick={() => toggleFeatured(shop._id, true)}
                          >
                            <Pin className="size-3.5" />
                            Pin
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )
        ) : (
          /* --------------------------- claim admin --------------------------- */
          <div className="mt-10 max-w-md border-2 border-foreground p-8">
            {adminState.hasAdmin ? (
              <>
                <div className="mb-4 flex size-10 items-center justify-center bg-[var(--swiss-blue)]">
                  <ShieldCheck className="size-5 text-white" />
                </div>
                <h2 className="text-lg font-bold uppercase">
                  Enter admin code
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  An admin has already been set up for this site. Enter the
                  admin invite code to become an admin.
                </p>
              </>
            ) : (
              <>
                <div className="mb-4 flex size-10 items-center justify-center bg-primary">
                  <ShieldCheck className="size-5 text-primary-foreground" />
                </div>
                <h2 className="text-lg font-bold uppercase">Claim admin</h2>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  This site has no admin yet. The first person to set an admin
                  code owns that role — generate a code, then enter it to claim
                  admin and start picking featured stores.
                </p>
                <Button
                  variant="outline"
                  onClick={handleGenerateCode}
                  className="mt-4 w-full gap-1.5 border-foreground"
                >
                  <KeyRound className="size-4" />
                  Generate admin code
                </Button>
              </>
            )}
            <form onSubmit={handleClaim} className="mt-5 space-y-4">
              <div>
                <label htmlFor="admin-code" className="grid-label mb-2 block">
                  Admin code
                </label>
                <Input
                  id="admin-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  required
                  className="h-12 border-foreground text-center font-mono-swiss text-xl tracking-[0.3em]"
                />
              </div>
              <Button
                type="submit"
                disabled={claiming || code.trim().length < 4}
                className="w-full py-6 text-sm font-bold uppercase tracking-wider"
              >
                {claiming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Become admin"
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
